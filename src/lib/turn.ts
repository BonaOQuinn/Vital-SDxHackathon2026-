import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "@/lib/env";
import { buildSystemPrompt } from "@/lib/turn-prompt";
import type { Alert, TurnRequest, TurnResponse } from "@/lib/contract";
import type { ReportItem } from "@/lib/report-grounding";
import type { PatientProfile } from "@/data/types";
import { demoProfile } from "@/data";

const localized = z.object({ en: z.string(), es: z.string() });

const turnSchema = z.object({
  source_lang: z.enum(["en", "es"]),
  translation: z.string().min(1),
  report_refs: z.array(z.string()),
  alerts: z.array(
    z.object({
      kind: z.enum(["allergy", "anticoagulant", "medication_interaction", "profile"]),
      message: localized,
      trigger: z.string(),
    }),
  ),
  flagged_terms: z.array(
    z.object({
      term: z.string(),
      reason: z.enum(["low_confidence", "drug_name", "number", "ambiguous"]),
      readBack: z.boolean(),
    }),
  ),
});

// JSON schema for structured output (Opus 5.5 does not allow forced tool use).
const TURN_JSON_SCHEMA = {
    type: "object",
    properties: {
      source_lang: { type: "string", enum: ["en", "es"] },
      translation: { type: "string" },
      report_refs: { type: "array", items: { type: "string" } },
      alerts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["allergy", "anticoagulant", "medication_interaction", "profile"] },
            message: {
              type: "object",
              properties: { en: { type: "string" }, es: { type: "string" } },
              required: ["en", "es"],
            },
            trigger: { type: "string" },
          },
          required: ["kind", "message", "trigger"],
        },
      },
      flagged_terms: {
        type: "array",
        items: {
          type: "object",
          properties: {
            term: { type: "string" },
            reason: { type: "string", enum: ["low_confidence", "drug_name", "number", "ambiguous"] },
            readBack: { type: "boolean" },
          },
          required: ["term", "reason", "readBack"],
        },
      },
    },
    required: ["source_lang", "translation", "report_refs", "alerts", "flagged_terms"],
  };

function strictify<T>(node: T): T {
  if (Array.isArray(node)) return node.map(strictify) as T;
  if (node && typeof node === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) o[k] = strictify(v);
    if (o.type === "object") o.additionalProperties = false;
    return o as T;
  }
  return node;
}

let client: Anthropic | undefined;
const anthropic = () => (client ??= new Anthropic({ apiKey: env.anthropicKey }));

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Deterministic safety net: if the transcript names an allergen or cross-reactive
 * drug and Claude raised no allergy alert, add one in plain code.
 */
function allergySafetyNet(profile: PatientProfile, text: string, alerts: Alert[]): Alert[] {
  if (alerts.some((a) => a.kind === "allergy")) return alerts;
  const haystack = norm(text);
  for (const allergy of profile.allergies) {
    const hit = allergy.crossReactiveTerms.find((t) => haystack.includes(norm(t)));
    if (hit) {
      return [
        ...alerts,
        {
          id: `alert-allergy-${allergy.allergen}`,
          kind: "allergy",
          message: {
            en: `Allergy alert: ${profile.fullName} is allergic to ${allergy.allergen} (${allergy.severity}). "${hit}" is related.`,
            es: `Alerta de alergia: ${profile.fullName} es alérgico/a a ${allergy.allergen} (${allergy.severity}). "${hit}" está relacionado.`,
          },
          trigger: hit,
        },
      ];
    }
  }
  return alerts;
}

export async function runTurn(req: TurnRequest, report: ReportItem[] = []): Promise<Omit<TurnResponse, "original" | "index" | "persisted"> & { report_refs: string[] }> {
  const profile = req.profile ?? demoProfile;
  const history = (req.history ?? []).slice(-6).map((h) => `${h.speaker}: ${h.original}`).join("\n");
  const userText = history
    ? `Recent turns (context only, do not translate):\n${history}\n\nTranscript to translate:\n${req.transcript}`
    : `Transcript to translate:\n${req.transcript}`;

  const msg = await anthropic().messages.create({
    model: env.claudeModel,
    max_tokens: 4000,
    system: buildSystemPrompt(profile, report),
    output_config: {
      effort: "low", // lowest latency; thinking cannot be disabled on Opus 5.5
      format: { type: "json_schema", schema: strictify(TURN_JSON_SCHEMA) },
    },
    messages: [{ role: "user", content: userText }],
  });

  const text = msg.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error(`Claude returned no JSON (stop_reason: ${msg.stop_reason})`);
  const out = turnSchema.parse(JSON.parse(text.text));

  const alerts: Alert[] = out.alerts.map((a) => ({ id: `alert-${a.kind}-${crypto.randomUUID().slice(0, 8)}`, ...a }));
  return {
    speaker: out.source_lang === "en" ? "patient" : "clinician",
    source_lang: out.source_lang,
    translation: out.translation,
    report_refs: out.report_refs,
    alerts: allergySafetyNet(profile, `${req.transcript} ${out.translation}`, alerts),
    flagged_terms: out.flagged_terms,
  };
}
