import { after } from "next/server";
import { z } from "zod";
import { runTurn } from "@/lib/turn";
import { env } from "@/lib/env";
import { checkTurn, mergeAlerts } from "@/lib/safety-checks";
import { extractNotes, fallbackTurn, guessLang } from "@/lib/translate";
import type { TurnRequest, TurnResponse } from "@/lib/contract";
import { appendTurn, isSessionId } from "@/lib/db";
import { updateInjuryRecord } from "@/lib/injury";

export const maxDuration = 30;

const bodySchema = z.object({
  sessionId: z.string().min(1),
  transcript: z.string().trim().min(1).max(2000),
  profile: z.any().optional(),
  history: z
    .array(z.object({ speaker: z.enum(["patient", "clinician"]), original: z.string() }))
    .optional(),
  detected_lang: z.enum(["en", "es"]).optional(),
  unverified: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const input = parsed.data as TurnRequest;
    // Translation and notes run in parallel; notes never block or fail the turn.
    // Without an Anthropic key, fall back to the scripted demo turns.
    const turnP = env.hasAnthropic
      ? runTurn(input).then((t) => ({ ...t, engine: "claude" as const }))
      : Promise.resolve(fallbackTurn(input));
    const speakerGuess = (input.detected_lang ?? guessLang(input.transcript)) === "en" ? "patient" : "clinician";
    const [result, notes] = await Promise.all([turnP, extractNotes(input, speakerGuess).catch(() => [])]);

    // Profile-consistency checks in plain code, merged ahead of Claude's alerts.
    const alerts = mergeAlerts(checkTurn(input.transcript, result.speaker, input.profile, input.unverified), result.alerts);
    const response: TurnResponse = {
      ...result,
      alerts,
      original: input.transcript,
      persisted: false,
      target_lang: result.source_lang === "en" ? "es" : "en",
      notes,
    };

    // Store the turn, but never let a database problem block the live translation.
    if (isSessionId(input.sessionId)) {
      try {
        response.index = await appendTurn(input.sessionId, {
          speaker: result.speaker,
          source_lang: result.source_lang,
          original: input.transcript,
          translation: result.translation,
          alerts,
          flagged_terms: result.flagged_terms,
        });
        response.persisted = true;
        // Non-blocking: update the injury record after the response has been sent.
        const sid = input.sessionId;
        after(() => updateInjuryRecord(sid).catch((e) => console.error("injury update failed", e)));
      } catch (e) {
        console.error("persist failed", e);
      }
    }
    return Response.json(response);
  } catch (e) {
    console.error("turn failed", e);
    return Response.json({ error: "Turn failed" }, { status: 502 });
  }
}
