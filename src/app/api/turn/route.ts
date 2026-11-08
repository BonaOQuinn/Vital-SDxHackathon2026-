import { after } from "next/server";
import { z } from "zod";
import { runTurn } from "@/lib/turn";
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
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const input = parsed.data as TurnRequest;
    const result = await runTurn(input);
    const response: TurnResponse = { ...result, original: input.transcript, persisted: false };

    // Store the turn, but never let a database problem block the live translation.
    if (isSessionId(input.sessionId)) {
      try {
        response.index = await appendTurn(input.sessionId, {
          speaker: result.speaker,
          source_lang: result.source_lang,
          original: input.transcript,
          translation: result.translation,
          alerts: result.alerts,
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
