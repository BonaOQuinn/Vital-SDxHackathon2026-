import { z } from "zod";
import { runTurn } from "@/lib/turn";
import type { TurnRequest } from "@/lib/contract";

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
    return Response.json(await runTurn(parsed.data as TurnRequest));
  } catch (e) {
    console.error("turn failed", e);
    return Response.json({ error: "Turn failed" }, { status: 502 });
  }
}
