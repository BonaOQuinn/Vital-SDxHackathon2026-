import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { env } from "@/lib/env";
import { narrativeFromNotes, type Narrative, type PatientEmergencyReport, type ReportRequest } from "@/lib/report";

const Bi = z.object({ en: z.string(), es: z.string() });
const NarrativeSchema = z.object({
  whatHappened: Bi,
  injuries: z.array(Bi),
  symptoms: z.array(Bi),
  timeline: z.array(Bi),
  treatment: z.array(Bi),
  instructions: z.array(Bi),
});

const SYSTEM = `You write the narrative part of a Patient Emergency Report from an interpreted emergency-room conversation.
Use only what was said. Never diagnose, never add advice or instructions the clinician did not give.
Keep drug names, doses and numbers verbatim. Each item is one short sentence, in English (en) and Spanish (es).
Empty arrays are fine when something was not discussed.`;

async function claudeNarrative(body: ReportRequest): Promise<Narrative | null> {
  const client = new Anthropic({ apiKey: env.anthropicKey });
  const transcript = body.turns.map((t) => `${t.speaker} (${t.source_lang}): ${t.original}`).join("\n");
  const notes = body.notes.map((n) => `- [${n.category}] ${n.text}`).join("\n");
  const res = await client.messages.parse({
    model: env.claudeModel,
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(NarrativeSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: `TRANSCRIPT:\n${transcript}\n\nNOTES:\n${notes}` }],
  });
  return res.parsed_output ?? null;
}

export async function POST(req: Request) {
  const body = (await req.json()) as ReportRequest;
  if (!body?.profile || !Array.isArray(body.turns)) {
    return Response.json({ error: "profile and turns are required" }, { status: 400 });
  }
  let narrative: Narrative | null = null;
  if (env.hasAnthropic && body.turns.length > 0) {
    narrative = await claudeNarrative(body).catch((err) => {
      console.error("/api/report narrative failed", err);
      return null;
    });
  }
  const report: PatientEmergencyReport = {
    ...body,
    generatedAt: new Date().toISOString(),
    narrative: narrative ?? narrativeFromNotes(body.notes ?? [], body.turns),
    engine: narrative ? "claude" : "fallback",
  };
  return Response.json(report);
}
