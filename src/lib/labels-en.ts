// English labels for the profile codes in src/data/types.ts.
// The Spanish versions live in src/data/es-dictionary.ts (Luis).
import type {
  AllergenCode,
  BloodType,
  FrequencyCode,
  ReactionCode,
  RelationshipCode,
  RouteCode,
  SeverityCode,
  SexCode,
} from "@/data";

export const sexEn: Record<SexCode, string> = {
  female: "Female",
  male: "Male",
  intersex: "Intersex",
  not_specified: "Prefer not to say",
};

export const bloodTypes: BloodType[] = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-", "unknown"];
export const bloodTypeEn = (b: BloodType) => (b === "unknown" ? "Don't know" : b.replace("-", "−"));

export const allergenEn: Record<AllergenCode, string> = {
  penicillin: "Penicillin",
  amoxicillin: "Amoxicillin",
  cephalosporins: "Cephalosporins",
  sulfonamides: "Sulfa drugs",
  nsaids: "NSAIDs (ibuprofen, naproxen)",
  aspirin: "Aspirin",
  latex: "Latex",
  iodine_contrast: "Iodine contrast dye",
  peanut: "Peanuts",
  shellfish: "Shellfish",
};

/**
 * Words that should also raise the allergy alert when someone says them
 * (English and Spanish). Matches the shape of Luis's demo profile.
 */
export const allergenCrossReactive: Record<AllergenCode, string[]> = {
  penicillin: ["penicillin", "penicilina", "amoxicillin", "amoxicilina", "Augmentin", "ampicillin", "ampicilina", "dicloxacillin", "dicloxacilina", "piperacillin", "piperacilina"],
  amoxicillin: ["amoxicillin", "amoxicilina", "Augmentin", "penicillin", "penicilina"],
  cephalosporins: ["cephalosporin", "cefalosporina", "cephalexin", "cefalexina", "ceftriaxone", "ceftriaxona", "cefuroxime", "cefuroxima"],
  sulfonamides: ["sulfa", "sulfamethoxazole", "sulfametoxazol", "Bactrim", "trimethoprim", "trimetoprima"],
  nsaids: ["ibuprofen", "ibuprofeno", "naproxen", "naproxeno", "diclofenac", "diclofenaco", "ketorolac", "ketorolaco", "AINE"],
  aspirin: ["aspirin", "aspirina", "ácido acetilsalicílico"],
  latex: ["latex", "látex"],
  iodine_contrast: ["contrast", "contraste", "iodine", "yodo"],
  peanut: ["peanut", "cacahuate", "maní"],
  shellfish: ["shellfish", "mariscos", "shrimp", "camarón"],
};

export const reactionEn: Record<ReactionCode, string> = {
  anaphylaxis: "Anaphylaxis",
  hives: "Hives",
  rash: "Rash",
  swelling: "Swelling",
  breathing_difficulty: "Trouble breathing",
  nausea: "Nausea",
};

export const severityEn: Record<SeverityCode, string> = {
  mild: "Mild",
  moderate: "Moderate",
  severe: "Severe",
};

export const frequencyEn: Record<FrequencyCode, string> = {
  once_daily: "Once a day",
  twice_daily: "Twice a day",
  three_times_daily: "Three times a day",
  as_needed: "As needed",
  once: "One time only",
};

export const routeEn: Record<RouteCode, string> = {
  oral: "By mouth",
  iv: "IV",
  im: "Injection (muscle)",
  subcutaneous: "Injection (under skin)",
  topical: "On the skin",
};

export const relationshipEn: Record<RelationshipCode, string> = {
  spouse: "Spouse",
  partner: "Partner",
  parent: "Parent",
  sibling: "Sibling",
  child: "Child",
  friend: "Friend",
  primary_care_doctor: "My doctor",
};

export const doseUnits = ["mg", "mcg", "g", "mL", "units"] as const;
