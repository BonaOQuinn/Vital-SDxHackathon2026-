// Handoff contract between Bona (backend), Chris (voice) and Mia (frontend).
export type Lang = "en" | "es";

export interface TurnRequest {
  sessionId: string;
  transcript: string;
}

export interface TurnResponse {
  speaker: "patient" | "clinician";
  source_lang: Lang;
  translation: string;
  alerts: string[];        // allergy / profile alerts, to be spoken and bannered
  flagged_terms: string[]; // low-confidence terms to read back for confirmation
}
