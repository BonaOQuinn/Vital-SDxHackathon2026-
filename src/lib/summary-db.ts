import { db } from "@/lib/db";
import type { DoctorSummary, PatientProfile, PatientSummary, Turn } from "@/data/types";
import type { SummaryBundle } from "@/lib/summary-source";

// Public, read-only access to a stored summary by link token.
// Expiry is checked on every read, on the server, so an expired link never sends data.

export type SummaryLookup =
  | { status: "ok"; bundle: SummaryBundle }
  | { status: "expired" }
  | { status: "missing" };

const TOKEN = /^[0-9a-f]{32}$/;

export async function lookupSummary(token: string): Promise<SummaryLookup> {
  if (!TOKEN.test(token)) return { status: "missing" };

  const link = await db().from("summary_links").select("session_id, expires_at").eq("token", token).maybeSingle();
  if (link.error) throw new Error(`summary link lookup failed: ${link.error.message}`);
  if (!link.data) return { status: "missing" };
  if (new Date(link.data.expires_at) <= new Date()) return { status: "expired" };

  const session = await db()
    .from("sessions")
    .select("transcript, summary_es, summary_en, created_at, profile:profiles(data)")
    .eq("id", link.data.session_id)
    .maybeSingle();
  if (session.error) throw new Error(`summary session lookup failed: ${session.error.message}`);
  const row = session.data as unknown as {
    transcript: (Turn & { at?: string })[];
    summary_es: DoctorSummary | null;
    summary_en: PatientSummary | null;
    created_at: string;
    profile: { data: PatientProfile } | { data: PatientProfile }[] | null;
  } | null;
  if (!row || !row.summary_es || !row.summary_en) return { status: "missing" };

  const profile = Array.isArray(row.profile) ? row.profile[0]?.data : row.profile?.data;
  if (!profile) return { status: "missing" };

  const staffLang = row.transcript.find((t) => t.speaker === "clinician")?.source_lang ?? "es";
  return {
    status: "ok",
    bundle: {
      token,
      expiresAt: link.data.expires_at,
      profile,
      staffLang,
      patientLang: profile.preferredLanguage,
      // Doctor (es) and patient (en) are generated. Nurse and EMS are pitch-only.
      reports: { doctor: { es: row.summary_es }, nurse: {}, ems: {}, patient: { en: row.summary_en } },
      transcript: row.transcript.map((turn) => ({ turn, at: turn.at ?? row.created_at })),
    },
  };
}
