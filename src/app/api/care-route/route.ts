import { z } from "zod";
import { demoProfile, finalInjuryRecord } from "@/data";
import { assessCare, explainChoices, rankFacilities, type CareRouteResponse, type RecordedCase } from "@/lib/care-routing";
import { getSession, isSessionId } from "@/lib/db";
import { findFacilities } from "@/lib/facility-source";

export const maxDuration = 30;

const bodySchema = z.object({
  /** "demo", or a session uuid. */
  session: z.string().min(1),
  origin: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
});

async function loadRecord(session: string): Promise<RecordedCase | null> {
  if (session === "demo") return finalInjuryRecord;
  if (!isSessionId(session)) return null;
  const row = await getSession(session);
  if (!row || new Date(row.expires_at) <= new Date()) return null;
  return row.injury_record as RecordedCase;
}

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }
  const { session, origin } = parsed.data;
  try {
    const record = await loadRecord(session);
    if (!record) return Response.json({ error: "Not found" }, { status: 404 });

    // Sessions are not linked to a stored profile yet, so this matches the /api/turn default.
    const assessment = assessCare(demoProfile, record);
    const { facilities, dataSource, emergencyNumber } = await findFacilities(origin);
    const body: CareRouteResponse = {
      ...assessment,
      options: explainChoices(assessment, rankFacilities(assessment.level, origin, facilities)),
      dataSource,
      emergencyNumber,
    };
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("care route failed", e);
    return Response.json({ error: "Care route failed" }, { status: 502 });
  }
}
