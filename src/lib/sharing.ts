// What the patient agrees to share, section by section, and where each
// section came from. Insurance-imported sections stay "unverified" until the
// patient confirms them or re-enters them by hand.
import type { PatientProfile } from "@/data";

export type SectionId =
  | "identity"
  | "body"
  | "bloodType"
  | "allergies"
  | "medications"
  | "conditions"
  | "history"
  | "contacts"
  | "insurance";

export const sections: { id: SectionId; title: string; titleEs: string }[] = [
  { id: "identity", title: "Name and date of birth", titleEs: "Nombre y fecha de nacimiento" },
  { id: "bloodType", title: "Blood type", titleEs: "Tipo de sangre" },
  { id: "allergies", title: "Allergies", titleEs: "Alergias" },
  { id: "medications", title: "Current medications", titleEs: "Medicamentos actuales" },
  { id: "conditions", title: "Medical conditions", titleEs: "Padecimientos" },
  { id: "history", title: "Surgeries, vaccines and notes", titleEs: "Cirugías, vacunas y notas" },
  { id: "body", title: "Height and weight", titleEs: "Estatura y peso" },
  { id: "contacts", title: "Emergency contacts", titleEs: "Contactos de emergencia" },
  { id: "insurance", title: "Insurance", titleEs: "Seguro médico" },
];

export interface InsuranceInfo {
  provider: string;
  memberId: string;
  groupNumber?: string;
  /** Fictional. Always shown with a "simulated" note in the demo. */
  phone?: string;
}

export interface ProfileMeta {
  source: "manual" | "insurance" | "demo";
  /** Sections imported from insurance that the patient has not confirmed. */
  unverified: SectionId[];
  insurance?: InsuranceInfo;
}

export type Approvals = Partial<Record<SectionId, boolean>>;

/**
 * The profile as sent to the server and shown to the clinician: a full
 * PatientProfile shape with unapproved sections emptied, plus what was
 * approved and what is unverified.
 */
export interface SharedProfile extends PatientProfile {
  approved: SectionId[];
  unverified: SectionId[];
  insurance?: InsuranceInfo;
}

export function buildSharedProfile(profile: PatientProfile, meta: ProfileMeta, approvals: Approvals): SharedProfile {
  const ok = (id: SectionId) => approvals[id] === true;
  const approved = sections.map((s) => s.id).filter(ok);
  return {
    id: profile.id,
    preferredLanguage: profile.preferredLanguage,
    fullName: ok("identity") ? profile.fullName : "The patient",
    dateOfBirth: ok("identity") ? profile.dateOfBirth : "",
    sex: ok("identity") ? profile.sex : "not_specified",
    bloodType: ok("bloodType") ? profile.bloodType : "unknown",
    weight: ok("body") ? profile.weight : { kg: 0, entered: { value: 0, unit: "kg" } },
    height: ok("body") ? profile.height : { cm: 0, entered: { unit: "cm", value: 0 } },
    allergies: ok("allergies") ? profile.allergies : [],
    medications: ok("medications") ? profile.medications : [],
    conditions: ok("conditions") ? profile.conditions : [],
    pastProcedures: ok("history") ? profile.pastProcedures : [],
    immunizations: ok("history") ? profile.immunizations : [],
    additionalNotes: ok("history") ? profile.additionalNotes : undefined,
    emergencyContacts: ok("contacts") ? profile.emergencyContacts : [],
    insurance: ok("insurance") ? meta.insurance : undefined,
    approved,
    unverified: meta.unverified.filter(ok),
  };
}

/** Sections that are empty in the profile, so the patient knows what is missing. */
export function missingSections(profile: PatientProfile, meta: ProfileMeta): SectionId[] {
  const missing: SectionId[] = [];
  if (!profile.fullName || !profile.dateOfBirth) missing.push("identity");
  if (!profile.bloodType || profile.bloodType === "unknown") missing.push("bloodType");
  if (!profile.weight?.kg || !profile.height?.cm) missing.push("body");
  if (profile.emergencyContacts.length === 0) missing.push("contacts");
  if (!meta.insurance) missing.push("insurance");
  return missing;
}
