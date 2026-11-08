// Mock end-of-session summaries for the demo scenario, one per audience.
// In the real app one Claude call writes these from the transcript, the final
// injury record and the profile, using these types as the structured output.
//
// - doctor (es) and patient (en) are in scope for the demo.
// - nurse (es) and ems (es) are pitch only, for the scale slide.
//
// Weight, height and the patient header are not repeated here. The UI renders
// them from the profile with the unit-conversion code (kg first).
// Drug names and numbers are verbatim. Spanish is a first draft for review.

import type { DoctorSummary, EmsSummary, NurseSummary, PatientSummary } from "./types";
import { demoProfile } from "./demo-profile";
import { demoSessionId, finalInjuryRecord, turnTime } from "./demo-session";
import { disclaimerEn, disclaimerEs } from "./es-dictionary";

const base = {
  sessionId: demoSessionId,
  profileId: demoProfile.id,
  generatedAt: turnTime(12),
};

export const doctorSummary: DoctorSummary = {
  ...base,
  audience: "doctor",
  language: "es",
  disclaimer: disclaimerEs,
  criticalAlerts: [
    "ALERGIA GRAVE a penicilina (anafilaxia en 2015 con amoxicillin). Se propuso amoxicilina y se cambió a clindamicina.",
    "ANTICOAGULADA: apixaban 5 mg dos veces al día. Última dosis hoy a las 8:00. Golpe en la cabeza.",
  ],
  chiefComplaint: "Caída de scooter eléctrico con herida en antebrazo izquierdo, dolor en muñeca derecha y golpe en la frente.",
  mechanism: "Caída de un scooter eléctrico sobre el pavimento, aproximadamente 20 minutos antes de la consulta. Golpe de la frente contra el suelo. Sin pérdida del conocimiento (referido por la paciente).",
  findings: [
    "Herida cortante en antebrazo izquierdo de unos 4 cm, sangrado controlado (indicado por el personal médico).",
    "Muñeca derecha con dolor 7/10, hinchazón y sin poder girarla. Posible fractura referida, sin imagen aún.",
    "Golpe en la frente, sin pérdida del conocimiento. Dolor de cabeza leve.",
  ],
  vitals: finalInjuryRecord.vitals,
  interventions: [
    "Limpieza y sutura de la herida del antebrazo.",
    "clindamicina 300 mg vía oral (en lugar de amoxicilina por alergia).",
    "Refuerzo de tétanos (el último Td registrado fue en 2016).",
    "Traslado al hospital para tomografía de cráneo y radiografía de muñeca.",
  ],
  relevantHistory: [
    "Fibrilación auricular paroxística (desde 2021).",
    "Hipertensión arterial (desde 2019), controlada con lisinopril.",
    "Apendicectomía (2009).",
  ],
  currentMedications: [
    "apixaban (Eliquis) 5 mg, oral, dos veces al día.",
    "metoprolol succinate (Toprol-XL) 25 mg, oral, una vez al día.",
    "lisinopril (Zestril) 10 mg, oral, una vez al día.",
  ],
  openQuestions: [
    "No se mencionó una valoración neurológica (p. ej., escala de Glasgow) en la conversación.",
  ],
};

export const patientSummary: PatientSummary = {
  ...base,
  audience: "patient",
  language: "en",
  disclaimer: disclaimerEn,
  whatHappened:
    "You fell off an electric scooter in Ensenada and hit your forehead. You did not pass out. You had a cut on your left forearm and pain in your right wrist.",
  whatTheDoctorFound: [
    "The cut on your left forearm is about 4 cm. The bleeding was controlled.",
    "Your right wrist is swollen and you can't turn it. The doctor wants an X-ray to check for a fracture.",
    "Your heart rate was 96, blood pressure 148/92, and oxygen 98%.",
  ],
  whatWasDone: [
    "The wound was cleaned and stitched.",
    "You were given clindamicina 300 mg by mouth. The doctor first suggested amoxicilina, and changed it when you said you are allergic to penicillin.",
    "You got a tetanus booster.",
    "You are being moved to the hospital for a head CT scan and a wrist X-ray, because you take a blood thinner (apixaban) and hit your head.",
  ],
  instructionsFromTheDoctor: [
    "If your headache gets worse, you vomit, or you feel confused, tell someone right away.",
  ],
  questionsToAskYourDoctorAtHome: [
    "Should I keep taking apixaban as usual after this head injury?",
    "When should my stitches come out, and who should remove them?",
    "Should I follow up on my wrist X-ray results with an orthopedic doctor?",
  ],
};

export const nurseSummary: NurseSummary = {
  ...base,
  audience: "nurse",
  language: "es",
  disclaimer: disclaimerEs,
  headline: "Mujer de 47 años, anticoagulada con apixaban, golpe en la cabeza tras caída de scooter. Alergia grave a penicilina.",
  criticalAlerts: doctorSummary.criticalAlerts,
  vitals: finalInjuryRecord.vitals,
  painScore: 7,
  completedInterventions: [
    "Limpieza y sutura de herida en antebrazo izquierdo.",
    "clindamicina 300 mg vía oral.",
    "Refuerzo de tétanos.",
  ],
  pendingTasks: [
    "Tomografía de cráneo.",
    "Radiografía de muñeca derecha.",
    "Valoración neurológica no registrada en la conversación.",
    "Vigilar dolor de cabeza, vómito o confusión (indicado por el médico).",
  ],
};

export const emsSummary: EmsSummary = {
  ...base,
  audience: "ems",
  language: "es",
  disclaimer: disclaimerEs,
  mechanism: "Caída de scooter eléctrico sobre pavimento, hace aprox. 20 min. Golpe en la frente. Sin pérdida del conocimiento.",
  injuries: [
    "Herida de 4 cm en antebrazo izquierdo, suturada.",
    "Muñeca derecha: dolor 7/10, hinchazón, sin rotación. Posible fractura.",
    "Golpe en la frente con dolor de cabeza leve.",
  ],
  signs: ["FC 96 lpm", "PA 148/92 mmHg", "SpO2 98 %"],
  treatment: [
    "Sutura de la herida.",
    "clindamicina 300 mg vía oral.",
    "Refuerzo de tétanos.",
    "Destino: hospital para tomografía de cráneo y radiografía de muñeca.",
  ],
  criticalAlerts: doctorSummary.criticalAlerts,
};

export const demoSummaries = [doctorSummary, patientSummary, nurseSummary, emsSummary];
