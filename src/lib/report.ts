// The Patient Emergency Report: what the session sends to /api/report and
// what comes back. Profile facts come straight from the approved profile
// (never the LLM); Claude only writes the narrative from the notes.
import type { Alert, Note } from "@/lib/contract";
import type { SharedProfile } from "@/lib/sharing";

export interface SessionTurn {
  speaker: "patient" | "clinician";
  source_lang: "en" | "es";
  original: string;
  translation: string;
  at: string;
}

export interface ReviewedWarning extends Alert {
  /** Set when patient and clinician reviewed it together. */
  resolution?: "confirmed" | "corrected" | "dismissed";
}

export interface ReportRequest {
  sessionId: string;
  startedAt: string;
  profile: SharedProfile;
  turns: SessionTurn[];
  notes: Note[];
  warnings: ReviewedWarning[];
}

export interface Narrative {
  whatHappened: { en: string; es: string };
  injuries: { en: string; es: string }[];
  symptoms: { en: string; es: string }[];
  timeline: { en: string; es: string }[];
  treatment: { en: string; es: string }[];
  instructions: { en: string; es: string }[];
}

export interface PatientEmergencyReport extends ReportRequest {
  generatedAt: string;
  narrative: Narrative;
  engine: "claude" | "fallback";
}

const byCat = (notes: Note[], ...cats: Note["category"][]) =>
  notes.filter((n) => cats.includes(n.category)).map((n) => ({ en: n.text, es: n.text }));

/** Narrative built straight from the notes, used when Claude is unavailable. */
export function narrativeFromNotes(notes: Note[], turns: SessionTurn[]): Narrative {
  const first = notes.find((n) => n.category === "mechanism") ?? notes[0];
  const firstPatient = turns.find((t) => t.speaker === "patient");
  const what = first?.text ?? firstPatient?.original ?? "Not described during the conversation.";
  return {
    whatHappened: { en: what, es: firstPatient && what === firstPatient.original ? firstPatient.translation : what },
    injuries: byCat(notes, "injury"),
    symptoms: byCat(notes, "symptom", "pain"),
    timeline: byCat(notes, "timeline"),
    treatment: byCat(notes, "treatment", "medication"),
    instructions: byCat(notes, "instruction"),
  };
}
