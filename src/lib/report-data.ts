// Lean audience reports where every statement says where it came from:
// a turn of the conversation, a field of the medical profile, or both.
//
// Demo data, written from Luis's demo session and profile. Proposed backend
// contract: the end-of-session Claude call returns these shapes, with
// `sources` filled in for every statement (Vital never states anything it
// can't point back to).

/** Where a statement came from. */
export type SourceRef =
  | { kind: "turn"; turn: number }
  | { kind: "profile"; section: "basics"; key: "bloodType" | "weight" | "age" }
  | { kind: "profile"; section: "allergies"; key: string }
  | { kind: "profile"; section: "medications"; key: string }
  | { kind: "profile"; section: "conditions"; key: number }
  | { kind: "profile"; section: "immunizations"; key: number }
  | { kind: "profile"; section: "contacts"; key: number };

export interface Statement {
  /** Keyed by language code (es, en, fr, ...). */
  text: Partial<Record<string, string>>;
  sources: SourceRef[];
}

const turn = (...ns: number[]): SourceRef[] => ns.map((n) => ({ kind: "turn", turn: n }));
const allergy = (key: string): SourceRef => ({ kind: "profile", section: "allergies", key });
const med = (key: string): SourceRef => ({ kind: "profile", section: "medications", key });
const condition = (key: number): SourceRef => ({ kind: "profile", section: "conditions", key });
const s = (es: string, en: string, sources: SourceRef[]): Statement => ({ text: { es, en }, sources });

// ---------- Shared critical alerts ----------

export const criticalAlerts: Statement[] = [
  s(
    "Alergia grave a penicilina (anafilaxia). Se propuso amoxicilina y se cambió a clindamicina.",
    "Severe penicillin allergy (anaphylaxis). amoxicilina was proposed and changed to clindamicina.",
    [allergy("penicillin"), ...turn(8, 9, 10)],
  ),
  s(
    "Anticoagulada: apixaban 5 mg, última dosis hoy a las 8:00. Golpe en la cabeza.",
    "On a blood thinner: apixaban 5 mg, last dose today at 8:00. Hit her head.",
    [med("apixaban"), ...turn(4, 2)],
  ),
];

/** Vital signs come from one turn; the tiles share this source. */
export const vitalsSource: SourceRef[] = turn(7);
export const painSource: SourceRef[] = turn(6);

// ---------- Doctor ----------

export const doctorReport = {
  reason: s(
    "Caída de scooter eléctrico hace ~20 min: herida en antebrazo izquierdo, dolor en muñeca derecha y golpe en la frente sin pérdida del conocimiento.",
    "Electric scooter fall ~20 min ago: cut on the left forearm, right wrist pain, and hit her forehead without losing consciousness.",
    turn(0, 2),
  ),
  findings: [
    s("Herida de ~4 cm en antebrazo izquierdo, sangrado controlado.", "~4 cm cut on the left forearm, bleeding controlled.", turn(7)),
    s("Muñeca derecha: dolor 7/10, hinchazón, no puede girarla.", "Right wrist: pain 7/10, swelling, can't turn it.", turn(6)),
    s("Dolor de cabeza leve.", "Mild headache.", turn(2)),
  ],
  treatment: [
    s("Sutura de la herida, clindamicina 300 mg vía oral y refuerzo de tétanos.", "Wound stitched, clindamicina 300 mg by mouth and a tetanus booster.", turn(10)),
    s("Traslado al hospital para tomografía de cráneo y radiografía de muñeca.", "Transfer to hospital for a head CT and a wrist X-ray.", turn(11)),
  ],
  medications: [
    s("apixaban 5 mg, dos veces al día", "apixaban 5 mg, twice a day", [med("apixaban")]),
    s("metoprolol succinate 25 mg, una vez al día", "metoprolol succinate 25 mg, once a day", [med("metoprolol succinate")]),
    s("lisinopril 10 mg, una vez al día", "lisinopril 10 mg, once a day", [med("lisinopril")]),
  ],
  history: s(
    "Fibrilación auricular paroxística e hipertensión.",
    "Paroxysmal atrial fibrillation and high blood pressure.",
    [condition(0), condition(1)],
  ),
  openQuestions: [
    s(
      "No se mencionó una valoración neurológica tras el golpe en la cabeza.",
      "No neurological check was mentioned after the head strike.",
      turn(2, 11),
    ),
  ],
};

// ---------- Nurse ----------

export const nurseReport = {
  headline: s(
    "Mujer de 47 años, anticoagulada, con golpe en la cabeza. Alergia grave a penicilina.",
    "47-year-old woman on a blood thinner who hit her head. Severe penicillin allergy.",
    [{ kind: "profile", section: "basics", key: "age" }, med("apixaban"), ...turn(2), allergy("penicillin")],
  ),
  toDo: [
    s("Tomografía de cráneo.", "Head CT.", turn(11)),
    s("Radiografía de muñeca derecha.", "Right wrist X-ray.", turn(11)),
    s("Vigilar dolor de cabeza, vómito o confusión.", "Watch for worsening headache, vomiting or confusion.", turn(11)),
  ],
  done: [s("Herida suturada, clindamicina 300 mg oral, refuerzo de tétanos.", "Wound stitched, clindamicina 300 mg by mouth, tetanus booster.", turn(10))],
};

// ---------- Paramedics (MIST) ----------

export const emsReport = {
  mechanism: [
    s(
      "Caída de scooter eléctrico sobre pavimento hace ~20 min. Golpe en la frente, sin pérdida del conocimiento.",
      "Electric scooter fall onto pavement ~20 min ago. Hit forehead, no loss of consciousness.",
      turn(0, 2),
    ),
  ],
  injuries: [
    s("Herida de 4 cm en antebrazo izquierdo, suturada.", "4 cm cut on the left forearm, stitched.", turn(7, 10)),
    s("Muñeca derecha: dolor 7/10, hinchazón.", "Right wrist: pain 7/10, swelling.", turn(6)),
    s("Golpe en la frente, dolor de cabeza leve.", "Blow to the forehead, mild headache.", turn(2)),
  ],
  treatment: [
    s("clindamicina 300 mg oral y refuerzo de tétanos.", "clindamicina 300 mg by mouth and a tetanus booster.", turn(10)),
    s("Destino: hospital para tomografía de cráneo y radiografía de muñeca.", "Destination: hospital for head CT and wrist X-ray.", turn(11)),
  ],
};

// ---------- Patient (English) ----------

export const patientReport = {
  whatHappened: {
    text: {
      en: "You fell off an electric scooter, cut your left forearm, hurt your right wrist and hit your forehead. You didn't pass out.",
    },
    sources: turn(0, 2),
  } satisfies Statement,
  watchFor: {
    text: { en: "If your headache gets worse, you vomit, or you feel confused, tell someone right away." },
    sources: turn(11),
  } satisfies Statement,
  done: [
    { text: { en: "Your wound was cleaned and stitched." }, sources: turn(10) },
    {
      text: { en: "You got clindamicina 300 mg instead of amoxicilina, because of your penicillin allergy, and a tetanus booster." },
      sources: turn(8, 9, 10),
    },
  ] satisfies Statement[],
  next: {
    text: { en: "You're going to the hospital for a head CT scan and a wrist X-ray." },
    sources: turn(11),
  } satisfies Statement,
};
