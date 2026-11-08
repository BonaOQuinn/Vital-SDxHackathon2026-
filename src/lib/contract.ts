// Handoff contract between Bona (backend), Chris (voice) and Mia (frontend).
// Reuses the shared shapes in src/data/types.ts so the UI, fixtures and API agree.
// Fields marked "voice" were added for the voice loop; they are optional, so
// earlier callers keep working.
import type { Alert, FlaggedTerm, Lang, PatientProfile, Speaker } from "@/data/types";
import type { SectionId } from "@/lib/sharing";

export type { Alert, FlaggedTerm, Lang, Speaker };

export interface TurnRequest {
  sessionId: string;
  /** One committed transcript from Scribe. */
  transcript: string;
  /** Optional. Defaults to the demo profile until profiles are loaded from the database. */
  profile?: PatientProfile;
  /** Optional recent turns (oldest first) so Claude can resolve short replies like "yes". */
  history?: { speaker: Speaker; original: string }[];
  /** voice: language Scribe detected. Used only by the no-Claude fallback. */
  detected_lang?: Lang;
  /** voice: profile sections imported from insurance and not yet confirmed. */
  unverified?: SectionId[];
}

/** One structured note captured during the conversation. */
export interface Note {
  category: "mechanism" | "injury" | "symptom" | "pain" | "timeline" | "vitals" | "medication" | "allergy" | "history" | "treatment" | "instruction" | "other";
  /** English text. Drug names and numbers verbatim. */
  text: string;
}

export interface TurnResponse {
  speaker: Speaker; // en = patient, es = clinician (fixed demo direction)
  source_lang: Lang;
  translation: string; // 1-2 sentences, in the other language
  alerts: Alert[]; // bilingual messages, spoken and shown as a banner
  flagged_terms: FlaggedTerm[];
  /** voice: language of `translation`. */
  target_lang?: Lang;
  /** voice: notes for the Patient Emergency Report. */
  notes?: Note[];
  /** voice: "fallback" means no Anthropic key, scripted demo lookup. */
  engine?: "claude" | "fallback";
}
