// Fake demo patient. Seed for the `profiles` table.
// All data is invented. Phone numbers use the reserved 555-01xx range.
// No lab values on purpose (they need per-test conversion factors).
//
// The Spanish text below is a first draft. The Spanish-fluent teammate must
// review it before the demo.

import type { PatientProfile } from "./types";

export const demoProfile = {
  id: "demo-jordan-ellis",
  fullName: "Jordan Ellis",
  dateOfBirth: "1979-03-14",
  sex: "female",
  preferredLanguage: "en",
  bloodType: "O+",

  // 180 lb x 0.45359237 = 81.65 kg. Shown as "82 kg (180 lb)".
  weight: { kg: 81.65, entered: { value: 180, unit: "lb" } },
  // 5 ft 10 in = 70 in x 2.54 = 177.8 cm. Shown as "178 cm (5 ft 10 in)".
  height: { cm: 177.8, entered: { unit: "ft_in", ft: 5, in: 10 } },

  allergies: [
    {
      allergen: "penicillin",
      reaction: ["anaphylaxis", "hives"],
      severity: "severe",
      note: {
        en: "Anaphylaxis in 2015 after a dose of amoxicillin. Treated with epinephrine in the ER.",
        es: "Anafilaxia en 2015 después de una dosis de amoxicillin. Tratada con epinefrina en urgencias.",
      },
      crossReactiveTerms: [
        "penicillin",
        "penicilina",
        "amoxicillin",
        "amoxicilina",
        "Augmentin",
        "ampicillin",
        "ampicilina",
        "dicloxacillin",
        "dicloxacilina",
        "piperacillin",
        "piperacilina",
      ],
    },
  ],

  medications: [
    {
      name: "apixaban",
      brandName: "Eliquis",
      dose: { amount: 5, unit: "mg" },
      frequency: "twice_daily",
      route: "oral",
      purpose: {
        en: "Blood thinner for atrial fibrillation (stroke prevention).",
        es: "Anticoagulante para fibrilación auricular (prevención de embolia cerebral).",
      },
      alertClass: "anticoagulant",
    },
    {
      name: "metoprolol succinate",
      brandName: "Toprol-XL",
      dose: { amount: 25, unit: "mg" },
      frequency: "once_daily",
      route: "oral",
      purpose: {
        en: "Heart rate control for atrial fibrillation.",
        es: "Control de la frecuencia cardiaca por fibrilación auricular.",
      },
      alertClass: "beta_blocker",
    },
    {
      name: "lisinopril",
      brandName: "Zestril",
      dose: { amount: 10, unit: "mg" },
      frequency: "once_daily",
      route: "oral",
      purpose: {
        en: "High blood pressure.",
        es: "Presión arterial alta.",
      },
    },
  ],

  conditions: [
    {
      name: { en: "Paroxysmal atrial fibrillation", es: "Fibrilación auricular paroxística" },
      since: 2021,
    },
    {
      name: { en: "High blood pressure (hypertension)", es: "Hipertensión arterial" },
      since: 2019,
      note: {
        en: "Controlled with lisinopril.",
        es: "Controlada con lisinopril.",
      },
    },
  ],

  pastProcedures: [
    { name: { en: "Appendectomy", es: "Apendicectomía" }, year: 2009 },
  ],

  immunizations: [
    // Older than 5 years, so it matters for a dirty wound.
    { name: { en: "Tetanus booster (Td)", es: "Refuerzo de toxoide tetánico (Td)" }, lastDose: "2016-05-10" },
  ],

  emergencyContacts: [
    { name: "Sam Ellis", relationship: "spouse", phone: "+16195550142", languages: ["en"] },
    { name: "Dr. Priya Natarajan", relationship: "primary_care_doctor", phone: "+18585550199", languages: ["en"] },
  ],

  additionalNotes: {
    en: "Takes apixaban 5 mg twice daily, morning and evening. Has not missed doses this week.",
    es: "Toma apixaban 5 mg dos veces al día, en la mañana y en la noche. No ha omitido dosis esta semana.",
  },
} satisfies PatientProfile;

/**
 * ASR keywords for Scribe (limit 50). Drug names from the profile, so the
 * transcript keeps them spelled correctly.
 */
export const demoAsrKeywords: string[] = [
  ...new Set([
    ...demoProfile.medications.flatMap((m) => [m.name, m.brandName]),
    ...demoProfile.allergies.flatMap((a) => a.crossReactiveTerms),
    "Td",
    "tetanus",
    "tétanos",
  ]),
].slice(0, 50);
