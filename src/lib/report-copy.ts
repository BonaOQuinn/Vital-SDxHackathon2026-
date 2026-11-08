// Fixed wording for the summary reports, in both languages.
// Spanish reuses Luis's static dictionary (src/data/es-dictionary.ts) so
// fixed fields never depend on the LLM; English is the matching wording.
import {
  bloodTypeEs,
  labelsEs,
  relationshipEs,
  sexEs,
  vitalKindEs,
  type BloodType,
  type RelationshipCode,
  type SexCode,
  type VitalSign,
} from "@/data";
import { bloodTypeEn, relationshipEn, sexEn } from "./labels-en";
import { pick, type LangCode } from "./languages";

export interface ReportCopy {
  doctorTitle: string;
  nurseTitle: string;
  emsTitle: string;
  generated: (when: string) => string;
  seeTranscript: (n: number) => string;
  years: string;
  bloodTypeLabel: string;
  weight: string;
  height: string;
  dateOfBirth: string;
  criticalAlerts: string;
  chiefComplaint: string;
  mechanism: string;
  vitals: string;
  painScore: string;
  findings: string;
  interventions: string;
  completedInterventions: string;
  pendingTasks: string;
  currentMedications: string;
  relevantHistory: string;
  openQuestions: string;
  emergencyContacts: string;
  reportedByPatient: string;
  reportedByClinician: string;
  mist: { title: string; m: string; i: string; s: string; t: string };
  sex: (s: SexCode) => string;
  bloodType: (b: BloodType) => string;
  relationship: (r: RelationshipCode) => string;
  vitalKind: (k: VitalSign["kind"]) => string;
}

export const reportCopy: Record<"es" | "en", ReportCopy> = {
  es: {
    doctorTitle: labelsEs.doctorSummary,
    nurseTitle: labelsEs.nurseSummary,
    emsTitle: labelsEs.emsSummary,
    generated: (when) => `Generado el ${when}, a partir de la conversación y del perfil del paciente.`,
    seeTranscript: (n) => `Ver transcripción completa (${n} intervenciones)`,
    years: labelsEs.years,
    bloodTypeLabel: labelsEs.bloodType,
    weight: labelsEs.weight,
    height: labelsEs.height,
    dateOfBirth: labelsEs.dateOfBirth,
    criticalAlerts: labelsEs.criticalAlerts,
    chiefComplaint: labelsEs.chiefComplaint,
    mechanism: labelsEs.mechanism,
    vitals: labelsEs.vitals,
    painScore: labelsEs.painScore,
    findings: labelsEs.findings,
    interventions: labelsEs.interventions,
    completedInterventions: "Intervenciones realizadas",
    pendingTasks: labelsEs.pendingTasks,
    currentMedications: labelsEs.currentMedications,
    relevantHistory: labelsEs.relevantHistory,
    openQuestions: labelsEs.openQuestions,
    emergencyContacts: labelsEs.emergencyContacts,
    reportedByPatient: labelsEs.reportedByPatient,
    reportedByClinician: labelsEs.reportedByClinician,
    mist: { title: "Entrega MIST", m: "Mecanismo", i: "Lesiones", s: "Signos", t: "Tratamiento" },
    sex: (s) => sexEs[s],
    bloodType: (b) => bloodTypeEs[b],
    relationship: (r) => relationshipEs[r],
    vitalKind: (k) => vitalKindEs[k],
  },
  en: {
    doctorTitle: "Summary for the doctor",
    nurseTitle: "Summary for nursing",
    emsTitle: "Summary for paramedics",
    generated: (when) => `Generated ${when}, from the conversation and the patient's profile.`,
    seeTranscript: (n) => `See full transcript (${n} turns)`,
    years: "years",
    bloodTypeLabel: "Blood type",
    weight: "Weight",
    height: "Height",
    dateOfBirth: "Date of birth",
    criticalAlerts: "Critical alerts",
    chiefComplaint: "Reason for visit",
    mechanism: "How the injury happened",
    vitals: "Vital signs",
    painScore: "Pain (0 to 10)",
    findings: "Reported findings",
    interventions: "Treatment given",
    completedInterventions: "Treatment given",
    pendingTasks: "Still to do",
    currentMedications: "Current medications",
    relevantHistory: "Relevant history",
    openQuestions: "Open questions",
    emergencyContacts: "Emergency contacts",
    reportedByPatient: "Reported by the patient",
    reportedByClinician: "Stated by the medical staff",
    mist: { title: "MIST handover", m: "Mechanism", i: "Injuries", s: "Signs", t: "Treatment" },
    sex: (s) => sexEn[s],
    bloodType: (b) => bloodTypeEn(b),
    relationship: (r) => relationshipEn[r],
    vitalKind: (k) =>
      ({
        heart_rate: "Heart rate",
        blood_pressure: "Blood pressure",
        respiratory_rate: "Breathing rate",
        spo2: "Oxygen saturation",
        temperature: "Temperature",
        gcs: "Glasgow scale",
      })[k],
  },
};

/**
 * Fixed report wording for any language. Spanish and English exist today;
 * other spoken languages fall back to English labels until translated
 * (report content itself comes from the backend in each language).
 */
export function copyFor(lang: LangCode): ReportCopy {
  return pick(reportCopy, lang) ?? reportCopy.en;
}
