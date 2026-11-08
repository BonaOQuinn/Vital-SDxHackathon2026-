import { z } from "zod";
import { runTurn } from "@/lib/turn";
import { env } from "@/lib/env";
import { checkTurn, mergeAlerts } from "@/lib/safety-checks";
import { extractNotes, fallbackTurn, guessLang } from "@/lib/translate";
import type { TurnRequest, TurnResponse } from "@/lib/contract";

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
  const body = parsed.data as TurnRequest;
  try {
    // Translation and notes run in parallel; notes never block or fail the turn.
    const turnP = env.hasAnthropic ? runTurn(body).then((t): TurnResponse => ({ ...t, engine: "claude" })) : Promise.resolve(fallbackTurn(body));
    const speakerGuess = (body.detected_lang ?? guessLang(body.transcript)) === "en" ? "patient" : "clinician";
    const [turn, notes] = await Promise.all([turnP, extractNotes(body, speakerGuess).catch(() => [])]);
    // Profile-consistency checks in plain code, merged ahead of Claude's alerts.
    const checks = checkTurn(body.transcript, turn.speaker, body.profile, body.unverified);
    const res: TurnResponse = {
      ...turn,
      alerts: mergeAlerts(checks, turn.alerts),
      target_lang: turn.source_lang === "en" ? "es" : "en",
      notes,
    };
    return Response.json(res);
  } catch (e) {
    console.error("turn failed", e);
    return Response.json({ error: "Turn failed" }, { status: 502 });
  }
}
