// Demo scenario: the scripted conversation and the live injury record as it
// fills in, turn by turn.
//
// Story: Jordan Ellis (demo-profile.ts) falls off a rented electric scooter
// in Ensenada, Baja California, Mexico, and is seen at a local clinic.
// The script makes both alert paths fire:
// - Turn 2: a head strike while on apixaban raises the anticoagulant alert.
// - Turn 8: the doctor proposes amoxicilina, which raises the allergy alert.
// It also exercises verbatim drug names and numbers with read-back (turns 4 and 10).
//
// Mia can play `demoTurns` against the UI and show `injuryTimeline[i]` after
// turn i. Bona can use the turns as /api/turn fixtures.

import type { Alert, InjuryRecord, Injury, Intervention, OpenQuestion, Symptom, Turn, VitalSign } from "./types";

export const demoSessionId = "demo-session-ensenada";
export const demoLocation = { city: "Ensenada", region: "Baja California", country: "MX", emergencyNumber: "911" } as const;

const sessionStart = Date.parse("2026-11-08T15:10:00-08:00");
/** Turns are spaced 20 seconds apart in the mock. */
export const turnTime = (index: number) => new Date(sessionStart + index * 20_000).toISOString();

// ---------- Alerts ----------

export const anticoagulantAlert: Alert = {
  id: "alert-anticoagulant-head",
  kind: "anticoagulant",
  message: {
    en: "Alert: Jordan takes apixaban, a blood thinner, and hit their head. Bleeding risk is higher.",
    es: "Alerta: la paciente toma apixaban, un anticoagulante, y se golpeó la cabeza. Mayor riesgo de sangrado.",
  },
  trigger: "I hit my forehead",
};

export const penicillinAlert: Alert = {
  id: "alert-allergy-penicillin",
  kind: "allergy",
  message: {
    en: "Allergy alert: Jordan is severely allergic to penicillin (anaphylaxis). Amoxicillin is a penicillin.",
    es: "Alerta de alergia: la paciente tiene alergia grave a la penicilina (anafilaxia). La amoxicilina es una penicilina.",
  },
  trigger: "amoxicilina",
};

// ---------- Conversation ----------

export const demoTurns: Turn[] = [
  {
    index: 0,
    speaker: "patient",
    source_lang: "en",
    original: "I fell off an electric scooter about twenty minutes ago. My left arm is cut and bleeding, and my right wrist really hurts.",
    translation: "Me caí de un scooter eléctrico hace unos veinte minutos. Tengo una cortada en el brazo izquierdo que está sangrando, y me duele mucho la muñeca derecha.",
    alerts: [],
    flagged_terms: [],
  },
  {
    index: 1,
    speaker: "clinician",
    source_lang: "es",
    original: "¿Se golpeó la cabeza? ¿Perdió el conocimiento?",
    translation: "Did you hit your head? Did you lose consciousness?",
    alerts: [],
    flagged_terms: [],
  },
  {
    index: 2,
    speaker: "patient",
    source_lang: "en",
    original: "I hit my forehead on the ground, but I didn't pass out. I have a mild headache.",
    translation: "Me golpeé la frente contra el suelo, pero no me desmayé. Tengo un dolor de cabeza leve.",
    alerts: [anticoagulantAlert],
    flagged_terms: [],
  },
  {
    index: 3,
    speaker: "clinician",
    source_lang: "es",
    original: "Veo que toma apixaban. ¿A qué hora fue su última dosis?",
    translation: "I see you take apixaban. What time was your last dose?",
    alerts: [],
    flagged_terms: [{ term: "apixaban", reason: "drug_name", readBack: false }],
  },
  {
    index: 4,
    speaker: "patient",
    source_lang: "en",
    original: "I took apixaban 5 milligrams at 8 this morning.",
    translation: "Tomé apixaban 5 miligramos a las 8 de la mañana.",
    alerts: [],
    flagged_terms: [
      { term: "apixaban", reason: "drug_name", readBack: true },
      { term: "5 milligrams", reason: "number", readBack: true },
      { term: "8 this morning", reason: "number", readBack: true },
    ],
  },
  {
    index: 5,
    speaker: "clinician",
    source_lang: "es",
    original: "Del 0 al 10, ¿cuánto le duele la muñeca?",
    translation: "From 0 to 10, how much does your wrist hurt?",
    alerts: [],
    flagged_terms: [],
  },
  {
    index: 6,
    speaker: "patient",
    source_lang: "en",
    original: "About a 7. I can't turn it, and it's swelling.",
    translation: "Como un 7. No la puedo girar, y se está hinchando.",
    alerts: [],
    flagged_terms: [{ term: "7", reason: "number", readBack: false }],
  },
  {
    index: 7,
    speaker: "clinician",
    source_lang: "es",
    original: "Frecuencia cardiaca 96, presión 148 sobre 92, saturación 98 por ciento. La herida del antebrazo mide unos 4 centímetros y el sangrado está controlado.",
    translation: "Heart rate 96, blood pressure 148 over 92, oxygen saturation 98 percent. The forearm wound is about 4 centimeters and the bleeding is controlled.",
    alerts: [],
    flagged_terms: [
      { term: "96", reason: "number", readBack: false },
      { term: "148 sobre 92", reason: "number", readBack: false },
      { term: "98 por ciento", reason: "number", readBack: false },
      { term: "4 centímetros", reason: "number", readBack: false },
    ],
  },
  {
    index: 8,
    speaker: "clinician",
    source_lang: "es",
    original: "Voy a limpiar la herida y le voy a dar amoxicilina para prevenir una infección.",
    translation: "I'm going to clean the wound and give you amoxicilina to prevent an infection.",
    alerts: [penicillinAlert],
    flagged_terms: [{ term: "amoxicilina", reason: "drug_name", readBack: true }],
  },
  {
    index: 9,
    speaker: "patient",
    source_lang: "en",
    original: "No, I'm allergic to penicillin. I had anaphylaxis from amoxicillin.",
    translation: "No, soy alérgica a la penicilina. Tuve anafilaxia por amoxicillin.",
    alerts: [],
    flagged_terms: [
      { term: "penicillin", reason: "drug_name", readBack: false },
      { term: "amoxicillin", reason: "drug_name", readBack: false },
    ],
  },
  {
    index: 10,
    speaker: "clinician",
    source_lang: "es",
    original: "Entendido. Voy a suturar la herida. Le daré clindamicina 300 miligramos por vía oral y un refuerzo de tétanos.",
    translation: "Understood. I'm going to stitch the wound. I'll give you clindamicina 300 milligrams by mouth and a tetanus booster.",
    alerts: [],
    flagged_terms: [
      { term: "clindamicina", reason: "drug_name", readBack: true },
      { term: "300 miligramos", reason: "number", readBack: true },
    ],
  },
  {
    index: 11,
    speaker: "clinician",
    source_lang: "es",
    original: "Por el anticoagulante y el golpe en la cabeza, la vamos a trasladar al hospital para una tomografía de cráneo y una radiografía de la muñeca. Si el dolor de cabeza empeora, vomita o se siente confundida, avise de inmediato.",
    translation: "Because of the blood thinner and the head injury, we will transfer you to the hospital for a head CT scan and a wrist X-ray. If your headache gets worse, you vomit, or you feel confused, tell someone right away.",
    alerts: [],
    flagged_terms: [],
  },
];

// ---------- Live injury record ----------

/** What one turn adds to or changes in the record. The real backend gets a full record from Claude instead. */
interface RecordUpdate {
  mechanism?: InjuryRecord["mechanism"];
  addInjuries?: Injury[];
  patchInjuries?: { id: string; patch: Partial<Injury> }[];
  addSymptoms?: Symptom[];
  addVitals?: VitalSign[];
  addInterventions?: Intervention[];
  addQuestions?: OpenQuestion[];
  answerQuestions?: { id: string; answer: OpenQuestion["answer"] }[];
}

const updatesByTurn: Record<number, RecordUpdate> = {
  0: {
    mechanism: {
      description: {
        en: "Fell off a rented electric scooter onto pavement.",
        es: "Caída de un scooter eléctrico rentado sobre el pavimento.",
      },
      timeOfInjury: { en: "About 20 minutes before the visit", es: "Aproximadamente 20 minutos antes de la consulta" },
      lossOfConsciousness: "unknown",
      source: { reportedBy: "patient", turn: 0 },
    },
    addInjuries: [
      {
        id: "inj-forearm-laceration",
        region: "forearm",
        side: "left",
        type: "laceration",
        description: { en: "Cut on the left arm, bleeding.", es: "Herida cortante en el brazo izquierdo, con sangrado." },
        bleeding: "active",
        source: { reportedBy: "patient", turn: 0 },
      },
      {
        id: "inj-wrist",
        region: "wrist",
        side: "right",
        type: "other",
        description: { en: "Right wrist pain.", es: "Dolor en la muñeca derecha." },
        source: { reportedBy: "patient", turn: 0 },
      },
    ],
    addQuestions: [
      {
        id: "q-head-strike",
        question: { en: "Head strike or loss of consciousness?", es: "¿Golpe en la cabeza o pérdida del conocimiento?" },
        source: { reportedBy: "patient", turn: 0 },
      },
    ],
  },
  2: {
    mechanism: {
      description: {
        en: "Fell off a rented electric scooter onto pavement. Hit forehead on the ground.",
        es: "Caída de un scooter eléctrico rentado sobre el pavimento. Golpe de la frente contra el suelo.",
      },
      timeOfInjury: { en: "About 20 minutes before the visit", es: "Aproximadamente 20 minutos antes de la consulta" },
      lossOfConsciousness: "no",
      source: { reportedBy: "patient", turn: 0, updatedTurn: 2 },
    },
    addInjuries: [
      {
        id: "inj-head-strike",
        region: "head",
        side: "midline",
        type: "head_strike",
        description: { en: "Hit forehead on the ground. No loss of consciousness.", es: "Golpe en la frente contra el suelo. Sin pérdida del conocimiento." },
        source: { reportedBy: "patient", turn: 2 },
      },
    ],
    addSymptoms: [
      {
        id: "sym-headache",
        description: { en: "Mild headache.", es: "Dolor de cabeza leve." },
        source: { reportedBy: "patient", turn: 2 },
      },
    ],
    answerQuestions: [
      { id: "q-head-strike", answer: { en: "Hit forehead, did not pass out.", es: "Golpe en la frente, sin desmayo." } },
    ],
    addQuestions: [
      {
        id: "q-last-apixaban",
        question: { en: "Time of last apixaban dose?", es: "¿Hora de la última dosis de apixaban?" },
        source: { reportedBy: "patient", turn: 2 },
      },
      {
        id: "q-neuro",
        question: {
          en: "No neurological assessment (e.g. Glasgow score) was stated in the conversation.",
          es: "No se mencionó una valoración neurológica (p. ej., escala de Glasgow) en la conversación.",
        },
        source: { reportedBy: "patient", turn: 2 },
      },
    ],
  },
  4: {
    answerQuestions: [
      { id: "q-last-apixaban", answer: { en: "apixaban 5 mg at 8:00 this morning.", es: "apixaban 5 mg a las 8:00 de la mañana." } },
    ],
  },
  6: {
    patchInjuries: [
      {
        id: "inj-wrist",
        patch: {
          type: "possible_fracture",
          description: {
            en: "Right wrist pain, swelling, cannot rotate the wrist.",
            es: "Dolor e hinchazón en la muñeca derecha, no puede girarla.",
          },
          source: { reportedBy: "patient", turn: 0, updatedTurn: 6 },
        },
      },
    ],
    addSymptoms: [
      {
        id: "sym-wrist-pain",
        description: { en: "Right wrist pain.", es: "Dolor en la muñeca derecha." },
        painScore: 7,
        source: { reportedBy: "patient", turn: 6 },
      },
    ],
  },
  7: {
    addVitals: [
      { kind: "heart_rate", value: 96, unit: "bpm", source: { reportedBy: "clinician", turn: 7 } },
      { kind: "blood_pressure", value: { systolic: 148, diastolic: 92 }, unit: "mmHg", source: { reportedBy: "clinician", turn: 7 } },
      { kind: "spo2", value: 98, unit: "%", source: { reportedBy: "clinician", turn: 7 } },
    ],
    patchInjuries: [
      {
        id: "inj-forearm-laceration",
        patch: {
          description: {
            en: "Laceration on the left forearm, about 4 cm. Bleeding controlled.",
            es: "Herida cortante en el antebrazo izquierdo, de unos 4 cm. Sangrado controlado.",
          },
          sizeCm: 4,
          bleeding: "controlled",
          source: { reportedBy: "patient", turn: 0, updatedTurn: 7 },
        },
      },
    ],
  },
  10: {
    addInterventions: [
      {
        id: "int-wound-care",
        description: { en: "Wound cleaned and stitched.", es: "Limpieza y sutura de la herida." },
        source: { reportedBy: "clinician", turn: 10 },
      },
      {
        id: "int-clindamycin",
        description: { en: "clindamicina 300 mg by mouth (in place of amoxicilina).", es: "clindamicina 300 mg vía oral (en lugar de amoxicilina)." },
        drug: { name: "clindamicina", dose: { amount: 300, unit: "mg" }, route: "oral" },
        source: { reportedBy: "clinician", turn: 10 },
      },
      {
        id: "int-tetanus",
        description: { en: "Tetanus booster.", es: "Refuerzo de tétanos." },
        source: { reportedBy: "clinician", turn: 10 },
      },
    ],
  },
  11: {
    addInterventions: [
      {
        id: "int-transfer",
        description: {
          en: "Transfer to hospital for a head CT scan and a wrist X-ray.",
          es: "Traslado al hospital para tomografía de cráneo y radiografía de muñeca.",
        },
        source: { reportedBy: "clinician", turn: 11 },
      },
    ],
  },
};

function applyUpdate(prev: InjuryRecord, turn: Turn, update: RecordUpdate | undefined): InjuryRecord {
  const u = update ?? {};
  const injuries = [...prev.injuries, ...(u.addInjuries ?? [])].map((inj) => {
    const p = u.patchInjuries?.find((x) => x.id === inj.id);
    return p ? { ...inj, ...p.patch } : inj;
  });
  const openQuestions = [...prev.openQuestions, ...(u.addQuestions ?? [])].map((q) => {
    const a = u.answerQuestions?.find((x) => x.id === q.id);
    return a ? { ...q, answer: a.answer, answeredTurn: turn.index } : q;
  });
  return {
    ...prev,
    version: turn.index,
    updatedAt: turnTime(turn.index),
    mechanism: u.mechanism ?? prev.mechanism,
    injuries,
    symptoms: [...prev.symptoms, ...(u.addSymptoms ?? [])],
    vitals: [...prev.vitals, ...(u.addVitals ?? [])],
    interventions: [...prev.interventions, ...(u.addInterventions ?? [])],
    alerts: [...prev.alerts, ...turn.alerts],
    openQuestions,
  };
}

const emptyRecord: InjuryRecord = {
  sessionId: demoSessionId,
  version: -1,
  updatedAt: turnTime(0),
  injuries: [],
  symptoms: [],
  vitals: [],
  interventions: [],
  alerts: [],
  openQuestions: [],
};

/** `injuryTimeline[i]` is the record after turn i. */
export const injuryTimeline: InjuryRecord[] = demoTurns.reduce<InjuryRecord[]>((acc, turn) => {
  const prev = acc.at(-1) ?? emptyRecord;
  acc.push(applyUpdate(prev, turn, updatesByTurn[turn.index]));
  return acc;
}, []);

/** The record at the end of the session. Input to the summaries. */
export const finalInjuryRecord: InjuryRecord = injuryTimeline[injuryTimeline.length - 1];
