// English versions of Luis's Spanish staff summaries, so each report can be
// read in either language. Demo data only: in the real app the end-of-session
// Claude call should return every report in both languages.
//
// Drug names are kept exactly as they were said in the conversation
// (e.g. "amoxicilina", "clindamicina"), matching Luis's verbatim rule.
import { disclaimerEn, doctorSummary, emsSummary, nurseSummary, type DoctorSummary, type EmsSummary, type NurseSummary } from "@/data";
import type { LangCode } from "./languages";

/** Luis's summary types fix `language` to "es"; reports here can be any spoken language. */
export type Localized<T> = Omit<T, "language"> & { language: LangCode };

/** Staff disclaimer in English (Luis's English one is written for the patient). */
export const staffDisclaimerEn =
  "Vital translates and organizes what was said during the visit. It does not diagnose and does not replace a professional interpreter or emergency services. Verify critical details with the patient.";

const alertsEn = [
  "SEVERE ALLERGY to penicillin (anaphylaxis in 2015 with amoxicillin). amoxicilina was proposed and changed to clindamicina.",
  "ON A BLOOD THINNER: apixaban 5 mg twice a day. Last dose today at 8:00. Head strike.",
];

export const doctorSummaryEn: Localized<DoctorSummary> = {
  ...doctorSummary,
  language: "en",
  disclaimer: staffDisclaimerEn,
  criticalAlerts: alertsEn,
  chiefComplaint: "Fall from an electric scooter with a cut on the left forearm, right wrist pain and a blow to the forehead.",
  mechanism:
    "Fell from an electric scooter onto pavement about 20 minutes before the visit. Hit forehead on the ground. No loss of consciousness (reported by the patient).",
  findings: [
    "Cut on the left forearm, about 4 cm, bleeding controlled (stated by the medical staff).",
    "Right wrist pain 7/10, swelling, unable to turn it. Possible fracture reported, no imaging yet.",
    "Blow to the forehead, no loss of consciousness. Mild headache.",
  ],
  interventions: [
    "Forearm wound cleaned and stitched.",
    "clindamicina 300 mg by mouth (instead of amoxicilina because of the allergy).",
    "Tetanus booster (last recorded Td was in 2016).",
    "Transfer to hospital for a head CT and a wrist X-ray.",
  ],
  relevantHistory: [
    "Paroxysmal atrial fibrillation (since 2021).",
    "High blood pressure (since 2019), controlled with lisinopril.",
    "Appendectomy (2009).",
  ],
  currentMedications: [
    "apixaban (Eliquis) 5 mg, by mouth, twice a day.",
    "metoprolol succinate (Toprol-XL) 25 mg, by mouth, once a day.",
    "lisinopril (Zestril) 10 mg, by mouth, once a day.",
  ],
  openQuestions: ["A neurological check (e.g. Glasgow scale) was not mentioned in the conversation."],
};

export const nurseSummaryEn: Localized<NurseSummary> = {
  ...nurseSummary,
  language: "en",
  disclaimer: staffDisclaimerEn,
  headline: "47-year-old woman on apixaban (blood thinner), hit her head after a scooter fall. Severe penicillin allergy.",
  criticalAlerts: alertsEn,
  completedInterventions: ["Left forearm wound cleaned and stitched.", "clindamicina 300 mg by mouth.", "Tetanus booster."],
  pendingTasks: [
    "Head CT.",
    "Right wrist X-ray.",
    "Neurological check not recorded in the conversation.",
    "Watch for worsening headache, vomiting or confusion (stated by the doctor).",
  ],
};

export const emsSummaryEn: Localized<EmsSummary> = {
  ...emsSummary,
  language: "en",
  disclaimer: staffDisclaimerEn,
  mechanism: "Fall from an electric scooter onto pavement, about 20 min ago. Hit forehead. No loss of consciousness.",
  injuries: [
    "4 cm cut on the left forearm, stitched.",
    "Right wrist: pain 7/10, swelling, cannot rotate. Possible fracture.",
    "Blow to the forehead with mild headache.",
  ],
  signs: ["HR 96 bpm", "BP 148/92 mmHg", "SpO2 98 %"],
  treatment: [
    "Wound stitched.",
    "clindamicina 300 mg by mouth.",
    "Tetanus booster.",
    "Destination: hospital for head CT and wrist X-ray.",
  ],
  criticalAlerts: alertsEn,
};

// Re-exported so the source file has one place to import from.
export { disclaimerEn };
