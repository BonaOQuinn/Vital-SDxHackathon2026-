// "Ask Vital": follow-up questions about the patient after the conversation.
// DEMO: answers come from a small keyword lookup over the demo session and
// profile. Proposed backend: POST /api/ask { token, question, lang } returns
// an AgentAnswer, answering only from the transcript and profile, with sources.
// If nothing supports an answer, Vital says so instead of guessing.
import type { SourceRef, Statement } from "./report-data";

export type AgentAnswer = Statement;

const turn = (...ns: number[]): SourceRef[] => ns.map((n) => ({ kind: "turn", turn: n }));

const knowledge: { keywords: string[]; answer: AgentAnswer }[] = [
  {
    keywords: ["apixaban", "eliquis", "thinner", "anticoag", "last dose", "última dosis", "ultima dosis"],
    answer: {
      text: {
        en: "She took apixaban 5 mg at 8:00 this morning. Her profile says she takes it twice a day for atrial fibrillation.",
        es: "Tomó apixaban 5 mg a las 8:00 de esta mañana. Su perfil indica que lo toma dos veces al día por fibrilación auricular.",
      },
      sources: [...turn(4), { kind: "profile", section: "medications", key: "apixaban" }],
    },
  },
  {
    keywords: ["allerg", "alerg", "penicil", "amoxi"],
    answer: {
      text: {
        en: "Severe penicillin allergy: she had anaphylaxis from amoxicillin in 2015. She said this when amoxicilina was proposed.",
        es: "Alergia grave a penicilina: tuvo anafilaxia por amoxicillin en 2015. Lo dijo cuando se propuso amoxicilina.",
      },
      sources: [{ kind: "profile", section: "allergies", key: "penicillin" }, ...turn(9)],
    },
  },
  {
    keywords: ["conscious", "conocimiento", "pass out", "passed out", "desmay", "head", "cabeza"],
    answer: {
      text: {
        en: "She said she hit her forehead on the ground but did not pass out, and has a mild headache.",
        es: "Dijo que se golpeó la frente contra el suelo pero no se desmayó, y tiene un dolor de cabeza leve.",
      },
      sources: turn(2),
    },
  },
  {
    keywords: ["pain", "dolor", "hurt", "duele", "wrist", "muñeca", "muneca"],
    answer: {
      text: {
        en: "She rated her wrist pain about 7 out of 10. She can't turn the wrist and it's swelling.",
        es: "Calificó el dolor de la muñeca como 7 de 10. No puede girarla y se está hinchando.",
      },
      sources: turn(6),
    },
  },
  {
    keywords: ["tetanus", "tétanos", "tetanos", "vaccin", "vacuna"],
    answer: {
      text: {
        en: "Her last tetanus booster on record was in May 2016. A booster was given today.",
        es: "Su último refuerzo de tétanos registrado fue en mayo de 2016. Hoy se le aplicó un refuerzo.",
      },
      sources: [{ kind: "profile", section: "immunizations", key: 0 }, ...turn(10)],
    },
  },
  {
    keywords: ["medication", "medicine", "medicamento", "medicina", "takes", "toma"],
    answer: {
      text: {
        en: "apixaban 5 mg twice a day, metoprolol succinate 25 mg once a day, and lisinopril 10 mg once a day.",
        es: "apixaban 5 mg dos veces al día, metoprolol succinate 25 mg una vez al día y lisinopril 10 mg una vez al día.",
      },
      sources: [
        { kind: "profile", section: "medications", key: "apixaban" },
        { kind: "profile", section: "medications", key: "metoprolol succinate" },
        { kind: "profile", section: "medications", key: "lisinopril" },
      ],
    },
  },
  {
    keywords: ["blood type", "tipo de sangre", "grupo"],
    answer: {
      text: { en: "Her blood type is O+.", es: "Su tipo de sangre es O positivo." },
      sources: [{ kind: "profile", section: "basics", key: "bloodType" }],
    },
  },
  {
    keywords: ["contact", "contacto", "family", "familia", "husband", "spouse", "esposo", "call", "llamar"],
    answer: {
      text: {
        en: "Her emergency contact is Sam Ellis, her spouse, at +1 619 555 0142.",
        es: "Su contacto de emergencia es Sam Ellis, su cónyuge, al +1 619 555 0142.",
      },
      sources: [{ kind: "profile", section: "contacts", key: 0 }],
    },
  },
];

/** Suggested questions per language; other languages fall back to English. */
export const suggestedQuestions: Record<string, string[]> = {
  en: ["When was her last apixaban dose?", "Did she lose consciousness?", "Is her tetanus up to date?"],
  es: ["¿Cuándo fue su última dosis de apixaban?", "¿Perdió el conocimiento?", "¿Tiene el tétanos al día?"],
};

const notFound: AgentAnswer = {
  text: {
    en: "I couldn't find that in the conversation or in her medical profile.",
    es: "No encontré eso en la conversación ni en su perfil médico.",
  },
  sources: [],
};

export async function askVital(question: string): Promise<AgentAnswer> {
  await new Promise((r) => setTimeout(r, 700));
  const q = question.toLowerCase();
  return knowledge.find((k) => k.keywords.some((w) => q.includes(w)))?.answer ?? notFound;
}
