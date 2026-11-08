import { lookupSummary } from "@/lib/summary-db";

// GET /api/summary/<token>: public, read-only. 200 with the bundle, 410 when expired, 404 when unknown.
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  try {
    const r = await lookupSummary(token);
    if (r.status === "expired") return Response.json({ error: "Expired" }, { status: 410 });
    if (r.status === "missing") return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(r.bundle, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("summary read failed", e);
    return Response.json({ error: "Summary read failed" }, { status: 502 });
  }
}
