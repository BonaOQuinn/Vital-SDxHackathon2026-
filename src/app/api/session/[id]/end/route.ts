import { z } from "zod";
import { endSession } from "@/lib/summary";
import { isSessionId } from "@/lib/db";
import type { PatientProfile } from "@/data/types";

// POST /api/session/<id>/end  body (optional): { profile?, regenerate? }
// Writes the Spanish doctor summary and English patient copy, stores them, and returns
// the public summary link token: { token, expiresAt, path: "/s/<token>" }.
export const maxDuration = 60;

const body = z.object({ profile: z.any().optional(), regenerate: z.boolean().optional() });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isSessionId(id)) return Response.json({ error: "Invalid session id" }, { status: 400 });
  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  try {
    const r = await endSession(id, { profile: parsed.data.profile as PatientProfile | undefined, regenerate: parsed.data.regenerate });
    if (!r) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ token: r.token, expiresAt: r.expiresAt, path: `/s/${r.token}`, regenerated: r.regenerated });
  } catch (e) {
    console.error("end session failed", e);
    return Response.json({ error: "Could not write the summaries" }, { status: 502 });
  }
}
