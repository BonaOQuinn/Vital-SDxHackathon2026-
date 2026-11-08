// Handoff contract between Bona (backend), Chris (voice) and Mia (frontend).
// Reuses the shared shapes in src/data/types.ts so the UI, fixtures and API agree.
import type { Alert, FlaggedTerm, Lang, PatientProfile, Speaker } from "@/data/types";

export type { Alert, FlaggedTerm, Lang, Speaker };

export interface TurnRequest {
  sessionId: string;
  /** One committed transcript from Scribe. */
  transcript: string;
  /** Optional. Defaults to the demo profile until profiles are loaded from the database. */
  profile?: PatientProfile;
  /** Optional recent turns (oldest first) so Claude can resolve short replies like "yes". */
  history?: { speaker: Speaker; original: string }[];
}

export interface TurnResponse {
  speaker: Speaker; // en = patient, es = clinician (fixed demo direction)
  source_lang: Lang;
  translation: string; // 1-2 sentences, in the other language
  alerts: Alert[]; // bilingual messages, spoken and shown as a banner
  flagged_terms: FlaggedTerm[];
}
