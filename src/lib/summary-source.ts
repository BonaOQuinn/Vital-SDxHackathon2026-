// Where the summary page gets its data. For now the token "demo" returns
// Luis's demo summaries (Spanish staff reports, English patient copy) plus
// English versions of the staff reports. When Bona's /s/[token] backend
// lands, replace getSummaryBundle with a fetch; the page stays the same.
import {
  demoProfile,
  demoTurns,
  doctorSummary,
  emsSummary,
  nurseSummary,
  patientSummary,
  turnTime,
  type DoctorSummary,
  type EmsSummary,
  type NurseSummary,
  type PatientProfile,
  type PatientSummary,
  type Turn,
} from "@/data";
import type { LangCode } from "./languages";
import { doctorSummaryEn, emsSummaryEn, nurseSummaryEn, type Localized } from "./demo-summaries-en";

export type Audience = "doctor" | "nurse" | "ems" | "patient";

/** One spoken turn, word for word, with when it was said. */
export interface TranscriptEntry {
  turn: Turn;
  /** ISO timestamp. The backend needs to store this per turn (Turn has no time field yet). */
  at: string;
}

/** A report in each language spoken in the conversation (any code, e.g. es, en, fr). */
type ByLang<T> = Partial<Record<LangCode, Localized<T>>>;

export interface SummaryBundle {
  token: string;
  /** ISO timestamp. The link shows an expired state after this. */
  expiresAt: string;
  profile: PatientProfile;
  /** Language the medical staff spoke in this session: staff reports open in it. */
  staffLang: LangCode;
  /** The patient's language: the patient copy opens in it. */
  patientLang: LangCode;
  reports: {
    doctor: ByLang<DoctorSummary>;
    nurse: ByLang<NurseSummary>;
    ems: ByLang<EmsSummary>;
    patient: ByLang<PatientSummary>;
  };
  /** Every turn of the conversation, from the first word, in order. */
  transcript: TranscriptEntry[];
}

export function getSummaryBundle(token: string): SummaryBundle | null {
  if (token !== "demo") return null;
  const staffLang = demoTurns.find((t) => t.speaker === "clinician")?.source_lang ?? "es";
  return {
    token,
    expiresAt: "2026-11-15T23:59:00-08:00",
    profile: demoProfile,
    staffLang,
    patientLang: demoProfile.preferredLanguage,
    reports: {
      doctor: { es: doctorSummary, en: doctorSummaryEn },
      nurse: { es: nurseSummary, en: nurseSummaryEn },
      ems: { es: emsSummary, en: emsSummaryEn },
      patient: { en: patientSummary },
    },
    transcript: demoTurns.map((turn) => ({ turn, at: turnTime(turn.index) })),
  };
}
