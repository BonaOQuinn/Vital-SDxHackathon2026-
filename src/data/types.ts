// Shared data shapes for Vital: the patient profile, the live injury record,
// the conversation turns, and the four audience summaries.
//
// Rules from CLAUDE.md that these types encode:
// - Measurements are stored metric, with the value the user entered kept next
//   to it. Conversion and formatting are plain code, never the LLM.
// - Fixed fields use codes that map to the static Spanish dictionary
//   (es-dictionary.ts). Free text carries an English original and a Spanish
//   rendering.
// - Drug names and numbers are kept verbatim in every language.
// - Vital records what people said. It does not diagnose, so every finding
//   says who reported it and in which turn.

// ---------- Shared building blocks ----------

export type Lang = "en" | "es";

/** Free text with its English original and a Spanish rendering for clinicians. */
export interface LocalizedText {
  en: string;
  /** Reviewed or Claude-translated Spanish. Drug names and numbers stay verbatim. */
  es: string;
}

export type WeightUnit = "kg" | "lb";
export type LengthUnit = "cm" | "ft_in";

/** Weight stored in kg. `entered` is what the user typed, shown in parentheses. */
export interface Weight {
  kg: number;
  entered: { value: number; unit: WeightUnit };
}

/** Height stored in cm. `entered` keeps the original feet and inches. */
export interface Height {
  cm: number;
  entered: { unit: "cm"; value: number } | { unit: "ft_in"; ft: number; in: number };
}

/** A dose. The number and unit are never translated. */
export interface Dose {
  amount: number;
  unit: "mg" | "mcg" | "g" | "mL" | "units";
}

export type FrequencyCode = "once_daily" | "twice_daily" | "three_times_daily" | "as_needed" | "once";
export type RouteCode = "oral" | "iv" | "im" | "subcutaneous" | "topical";

// ---------- Patient profile (the `profiles` table) ----------

export type BloodType = "O+" | "O-" | "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "unknown";
export type SexCode = "female" | "male" | "intersex" | "not_specified";

export type AllergenCode =
  | "penicillin"
  | "amoxicillin"
  | "cephalosporins"
  | "sulfonamides"
  | "nsaids"
  | "aspirin"
  | "latex"
  | "iodine_contrast"
  | "peanut"
  | "shellfish";

export type ReactionCode = "anaphylaxis" | "hives" | "rash" | "swelling" | "breathing_difficulty" | "nausea";
export type SeverityCode = "mild" | "moderate" | "severe";

export interface Allergy {
  allergen: AllergenCode;
  reaction: ReactionCode[];
  severity: SeverityCode;
  /** Free-text context, e.g. when it happened. */
  note?: LocalizedText;
  /**
   * Related drugs that should also raise the alert (e.g. amoxicillin for a
   * penicillin allergy). Used by /api/turn to match what the clinician says.
   */
  crossReactiveTerms: string[];
}

export interface Medication {
  /** Generic name, verbatim. Never translated. */
  name: string;
  /** Brand name as the patient knows it, verbatim. */
  brandName?: string;
  dose: Dose;
  frequency: FrequencyCode;
  route: RouteCode;
  purpose: LocalizedText;
  /** Marks drugs that need a spoken alert in an injury (e.g. anticoagulants). */
  alertClass?: "anticoagulant" | "antiplatelet" | "insulin" | "beta_blocker";
}

export interface Condition {
  name: LocalizedText;
  /** Year diagnosed, if known. */
  since?: number;
  note?: LocalizedText;
}

export interface PastProcedure {
  name: LocalizedText;
  year: number;
}

export interface Immunization {
  name: LocalizedText;
  /** ISO date (YYYY-MM-DD) of the last dose. */
  lastDose: string;
}

export type RelationshipCode = "spouse" | "partner" | "parent" | "sibling" | "child" | "friend" | "primary_care_doctor";

export interface EmergencyContact {
  name: string;
  relationship: RelationshipCode;
  /** E.164 format. Demo numbers use the reserved 555-01xx range. */
  phone: string;
  languages: Lang[];
}

export interface PatientProfile {
  id: string;
  fullName: string;
  /** ISO date (YYYY-MM-DD). Age is computed in code. */
  dateOfBirth: string;
  sex: SexCode;
  preferredLanguage: Lang;
  bloodType: BloodType;
  weight: Weight;
  height: Height;
  allergies: Allergy[];
  medications: Medication[];
  conditions: Condition[];
  pastProcedures: PastProcedure[];
  immunizations: Immunization[];
  emergencyContacts: EmergencyContact[];
  /** Extra free-text history for the clinician. No lab values (see CLAUDE.md). */
  additionalNotes?: LocalizedText;
}

// ---------- Conversation turns (the /api/turn contract) ----------

export type Speaker = "patient" | "clinician";

export interface Alert {
  id: string;
  kind: "allergy" | "anticoagulant" | "medication_interaction" | "profile";
  /** Spoken and shown in both languages. */
  message: LocalizedText;
  /** The words in the turn that triggered the alert, verbatim. */
  trigger: string;
}

export interface FlaggedTerm {
  /** The term as transcribed, verbatim. */
  term: string;
  reason: "low_confidence" | "drug_name" | "number" | "ambiguous";
  /** Read back aloud for confirmation when true. */
  readBack: boolean;
}

/** What `POST /api/turn` returns, plus the original text and turn index. */
export interface Turn {
  index: number;
  speaker: Speaker;
  source_lang: Lang;
  original: string;
  translation: string;
  /** Set when this turn answers a question from Vital's intake. */
  asked?: string;
  alerts: Alert[];
  flagged_terms: FlaggedTerm[];
}

// ---------- Real-time injury record (updated after each turn) ----------

/** Who said it and when. Every finding carries one, because Vital does not diagnose. */
export interface Source {
  reportedBy: Speaker;
  /** Turn index where this was first said. */
  turn: number;
  /** Set when a later turn changed or confirmed it. */
  updatedTurn?: number;
}

export type BodyRegion =
  | "head"
  | "face"
  | "neck"
  | "chest"
  | "abdomen"
  | "back"
  | "shoulder"
  | "upper_arm"
  | "elbow"
  | "forearm"
  | "wrist"
  | "hand"
  | "hip"
  | "thigh"
  | "knee"
  | "lower_leg"
  | "ankle"
  | "foot";

export type Side = "left" | "right" | "both" | "midline";

export type InjuryType =
  | "laceration"
  | "abrasion"
  | "contusion"
  | "burn"
  | "possible_fracture"
  | "sprain"
  | "head_strike"
  | "other";

export interface Injury {
  id: string;
  region: BodyRegion;
  side: Side;
  type: InjuryType;
  /** What was described, in both languages. */
  description: LocalizedText;
  /** Size in cm, if stated. Stored metric. */
  sizeCm?: number;
  bleeding?: "none" | "controlled" | "active";
  source: Source;
}

export interface Symptom {
  id: string;
  description: LocalizedText;
  /** 0 to 10, as stated by the patient. */
  painScore?: number;
  source: Source;
}

export interface VitalSign {
  kind: "heart_rate" | "blood_pressure" | "respiratory_rate" | "spo2" | "temperature" | "gcs";
  /** Numbers verbatim. Blood pressure uses `systolic/diastolic`. */
  value: number | { systolic: number; diastolic: number };
  unit: "bpm" | "mmHg" | "breaths/min" | "%" | "°C" | "points";
  source: Source;
}

export interface Intervention {
  id: string;
  description: LocalizedText;
  /** Set when a drug was given. Name verbatim. */
  drug?: { name: string; dose: Dose; route: RouteCode };
  source: Source;
}

export interface OpenQuestion {
  id: string;
  question: LocalizedText;
  /** Set when a later turn answered it. */
  answer?: LocalizedText;
  source: Source;
  answeredTurn?: number;
}

export interface InjuryRecord {
  sessionId: string;
  /** Turn index of the last update. Increases with each update. */
  version: number;
  updatedAt: string;
  mechanism?: {
    description: LocalizedText;
    /** As stated, e.g. "about 20 minutes ago". Not converted to a timestamp. */
    timeOfInjury?: LocalizedText;
    lossOfConsciousness?: "yes" | "no" | "unknown";
    source: Source;
  };
  injuries: Injury[];
  symptoms: Symptom[];
  vitals: VitalSign[];
  interventions: Intervention[];
  /** Alerts raised so far in the session, in order. */
  alerts: Alert[];
  /** Missing information the clinician may want. Answered ones stay with their answer. */
  openQuestions: OpenQuestion[];
}

// ---------- Audience summaries (written once at the end of the session) ----------

interface SummaryBase {
  sessionId: string;
  profileId: string;
  generatedAt: string;
  /** Fixed safety line, shown at the bottom of every summary. */
  disclaimer: string;
}

/** For the treating doctor. Spanish, kg first, drug names verbatim. In scope for the demo. */
export interface DoctorSummary extends SummaryBase {
  audience: "doctor";
  language: "es";
  chiefComplaint: string;
  mechanism: string;
  findings: string[];
  vitals: VitalSign[];
  interventions: string[];
  /** Allergies, anticoagulants and other profile alerts. Shown first. */
  criticalAlerts: string[];
  relevantHistory: string[];
  currentMedications: string[];
  openQuestions: string[];
}

/** For the traveler. Plain English. In scope for the demo. */
export interface PatientSummary extends SummaryBase {
  audience: "patient";
  language: "en";
  whatHappened: string;
  whatTheDoctorFound: string[];
  whatWasDone: string[];
  /** Only instructions the clinician actually gave. Vital does not add advice. */
  instructionsFromTheDoctor: string[];
  questionsToAskYourDoctorAtHome: string[];
}

/** For a nurse at intake or triage. Spanish. Pitch only. */
export interface NurseSummary extends SummaryBase {
  audience: "nurse";
  language: "es";
  /** One line the nurse reads first. */
  headline: string;
  criticalAlerts: string[];
  vitals: VitalSign[];
  painScore?: number;
  completedInterventions: string[];
  pendingTasks: string[];
}

/**
 * For paramedics during a transfer. Spanish, MIST format
 * (Mechanism, Injuries, Signs, Treatment). Pitch only.
 */
export interface EmsSummary extends SummaryBase {
  audience: "ems";
  language: "es";
  mechanism: string;
  injuries: string[];
  signs: string[];
  treatment: string[];
  criticalAlerts: string[];
}

export type AudienceSummary = DoctorSummary | PatientSummary | NurseSummary | EmsSummary;
