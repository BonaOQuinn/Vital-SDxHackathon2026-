import { after } from "next/server";
import { z } from "zod";
import type { TurnRequest } from "@/lib/contract";
import { appendTurn, isSessionId } from "@/lib/db";
import { askNext } from "@/lib/intake";
import { updateInjuryRecord } from "@/lib/injury";
import { checkTurn, mergeAlerts } from "@/lib/safety-checks";
import { extractNotes } from "@/lib/translate";
import { runTurn } from "@/lib/turn";

// One answer from the patient to the agent. Each answer is also translated and
// stored as a normal turn, so the report and the later clinician conversation
// share one session, and Spanish-speaking staff can read what was said.
export const maxDuration = 60;

const bodySchema = z.object({
  sessionId: z.string().refine(isSessionId),
  transcript: z.string().trim().min(1).max(2000),
  asked: z.string().min(1).max(600),
  profile: z.any(),
  history: z.array(z.object({ asked: z.string(), answer: z.string() })).max(12).default([]),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  const { sessionId, transcript, asked, profile, history } = parsed.data;

  try {
    const input: TurnRequest = { sessionId, transcript, profile };
    const exchanges = [...history, { asked, answer: transcript }];
    const [turn, notes, next] = await Promise.all([runTurn(input), extractNotes(input, "patient").catch(() => []), askNext(profile, exchanges)]);
    const alerts = mergeAlerts(checkTurn(transcript, "patient", profile, undefined), turn.alerts);

    let persisted = false;
    try {
      await appendTurn(sessionId, { speaker: "patient", source_lang: turn.source_lang, original: transcript, translation: turn.translation, alerts, flagged_terms: turn.flagged_terms, asked });
      persisted = true;
      // The last answer waits for the report, because the next screen shows it.
      if (next.done) await updateInjuryRecord(sessionId).catch((e) => console.error("injury update failed", e));
      else after(() => updateInjuryRecord(sessionId).catch((e) => console.error("injury update failed", e)));
    } catch (e) {
      console.error("intake persist failed", e);
    }

    return Response.json({ reply: next.reply, done: next.done, source_lang: turn.source_lang, translation: turn.translation, alerts, notes, persisted });
  } catch (e) {
    console.error("intake failed", e);
    return Response.json({ error: "Intake failed" }, { status: 502 });
  }
}
