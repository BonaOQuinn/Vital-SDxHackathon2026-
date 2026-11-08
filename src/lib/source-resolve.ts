// Turns a SourceRef into what the "source" sheet shows: the exact line from
// the conversation, or the exact field from the medical profile.
import {
  allergenEs,
  bloodTypeEs,
  frequencyEs,
  reactionEs,
  relationshipEs,
  routeEs,
  severityEs,
  type PatientProfile,
  type Turn,
} from "@/data";
import { allergenEn, bloodTypeEn, frequencyEn, reactionEn, relationshipEn, routeEn, severityEn } from "./labels-en";
import { ageAt, phoneDisplay, weightClinician } from "./clinical-format";
import type { SourceRef } from "./report-data";
import { baseLang, type LangCode } from "./languages";
import type { TranscriptEntry } from "./summary-source";

export type ResolvedSource =
  | { kind: "turn"; turn: Turn; at: string }
  | { kind: "profile"; section: string; value: string; detail?: string }
  | { kind: "map"; name: string; listing: string; url: string };

const sectionName: Record<"es" | "en", Record<string, string>> = {
  en: {
    basics: "Basic details",
    allergies: "Allergies",
    medications: "Medications",
    conditions: "Conditions",
    immunizations: "Vaccines",
    contacts: "Emergency contacts",
  },
  es: {
    basics: "Datos básicos",
    allergies: "Alergias",
    medications: "Medicamentos",
    conditions: "Padecimientos",
    immunizations: "Vacunas",
    contacts: "Contactos de emergencia",
  },
};

export function resolveSource(
  ref: SourceRef,
  ctx: { profile: PatientProfile; transcript: TranscriptEntry[]; at: string },
  lang: LangCode,
): ResolvedSource | null {
  if (ref.kind === "turn") {
    const entry = ctx.transcript.find((e) => e.turn.index === ref.turn);
    return entry ? { kind: "turn", turn: entry.turn, at: entry.at } : null;
  }

  if (ref.kind === "map") return ref;

  const p = ctx.profile;
  // Fixed labels exist in Spanish and English; other languages use English
  // labels until translated. Free text uses the profile's en/es fields.
  const es = baseLang(lang) === "es";
  const loc = es ? "es" : "en";
  const section = sectionName[loc][ref.section];

  switch (ref.section) {
    case "basics": {
      if (ref.key === "bloodType") return { kind: "profile", section, value: es ? bloodTypeEs[p.bloodType] : bloodTypeEn(p.bloodType) };
      if (ref.key === "weight") return { kind: "profile", section, value: weightClinician(p.weight) };
      return { kind: "profile", section, value: `${ageAt(p.dateOfBirth, ctx.at)} ${es ? "años" : "years old"} (${p.dateOfBirth})` };
    }
    case "allergies": {
      const a = p.allergies.find((x) => x.allergen === ref.key);
      if (!a) return null;
      const name = es ? allergenEs[a.allergen] : allergenEn[a.allergen];
      const sev = es ? severityEs[a.severity] : severityEn[a.severity];
      const reactions = a.reaction.map((r) => (es ? reactionEs[r] : reactionEn[r])).join(", ");
      return { kind: "profile", section, value: `${name} · ${sev} · ${reactions}`, detail: a.note?.[loc] };
    }
    case "medications": {
      const m = p.medications.find((x) => x.name === ref.key);
      if (!m) return null;
      const freq = es ? frequencyEs[m.frequency] : frequencyEn[m.frequency];
      const route = es ? routeEs[m.route] : routeEn[m.route];
      const brand = m.brandName ? ` (${m.brandName})` : "";
      return { kind: "profile", section, value: `${m.name}${brand} ${m.dose.amount} ${m.dose.unit} · ${freq} · ${route}`, detail: m.purpose[loc] || undefined };
    }
    case "conditions": {
      const c = p.conditions[ref.key];
      if (!c) return null;
      const since = c.since ? (es ? ` (desde ${c.since})` : ` (since ${c.since})`) : "";
      return { kind: "profile", section, value: `${c.name[loc] || c.name.en}${since}`, detail: c.note?.[loc] };
    }
    case "immunizations": {
      const im = p.immunizations[ref.key];
      if (!im) return null;
      return { kind: "profile", section, value: im.name[loc] || im.name.en, detail: `${es ? "Última dosis" : "Last dose"}: ${im.lastDose}` };
    }
    case "contacts": {
      const c = p.emergencyContacts[ref.key];
      if (!c) return null;
      const rel = es ? relationshipEs[c.relationship] : relationshipEn[c.relationship];
      return { kind: "profile", section, value: `${c.name} · ${rel}`, detail: phoneDisplay(c.phone) };
    }
  }
}
