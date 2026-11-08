import { getSession, isSessionId } from "@/lib/db";

// Polling endpoint for the projector view (/view/[sessionId]). Poll about once a second.
// Returns transcript, injury record, summaries and status. Never cached.

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isSessionId(id)) return Response.json({ error: "Invalid session id" }, { status: 400 });
  try {
    const s = await getSession(id);
    if (!s) return Response.json({ error: "Not found" }, { status: 404 });
    if (new Date(s.expires_at) <= new Date()) return Response.json({ error: "Expired" }, { status: 410 });
    return Response.json(
      {
        id: s.id,
        status: s.status,
        transcript: s.transcript,
        injury_record: s.injury_record,
        summary_es: s.summary_es,
        summary_en: s.summary_en,
        expires_at: s.expires_at,
        updated_at: s.updated_at,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("session read failed", e);
    return Response.json({ error: "Session read failed" }, { status: 502 });
  }
}
