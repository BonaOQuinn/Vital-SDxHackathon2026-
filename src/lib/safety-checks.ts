// Deterministic checks that compare what was said against the approved
// profile. Plain code, no LLM, so inconsistency warnings still fire when
// Claude is slow, wrong or unavailable. Complements Bona's allergySafetyNet
// in turn.ts, which covers allergens mentioned in a turn.
import type { AllergenCode, Alert, PatientProfile } from "@/data/types";
import { allergenEn, allergenCrossReactive } from "@/lib/labels-en";
import { allergenEs } from "@/data/es-dictionary";
import type { SectionId } from "@/lib/sharing";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasWord = (text: string, term: string) => new RegExp(`\\b${escape(norm(term))}`).test(norm(text));

/** Every word that names an allergen, in English and Spanish. */
function allergenTerms(code: AllergenCode, extra: string[] = []): string[] {
  return [code, allergenEn[code].split(" (")[0], allergenEs[code].split(" (")[0], ...allergenCrossReactive[code], ...extra];
}

const allCodes = Object.keys(allergenEn) as AllergenCode[];

/** Allergens the speaker says they are allergic to ("allergic to X", "alérgica a X"). */
function claimedAllergens(text: string): { code: AllergenCode; said: string }[] {
  const m = norm(text).match(/(allergic to|allergy to|allergies to|alergic[oa] a|alergia a)\s+([a-z ,]+)/);
  if (!m) return [];
  const found: { code: AllergenCode; said: string }[] = [];
  for (const code of allCodes) {
    const hit = allergenTerms(code).find((term) => hasWord(m[2], term));
    if (hit && !found.some((f) => norm(f.said) === norm(hit))) found.push({ code, said: hit });
  }
  return found;
}

const deniesAllergies = (t: string) =>
  /\b(no|not any|don'?t have any|without)\s+(known\s+)?(drug\s+)?allerg/.test(norm(t)) || /\bno (tengo|tiene) alergias\b|\bsin alergias\b/.test(norm(t));
const deniesMedications = (t: string) =>
  /\b(don'?t|do not) take any (medication|medicine|pills)|\bno (medications|medicines)\b|\bno (tomo|toma) (ningun|medicamentos)/.test(norm(t));
const BLOOD = /\b(?:blood type|tipo de sangre)(?: is| es)?\s*(ab|a|b|o)\s*(positive|negative|positivo|negativo|\+|-)/;
const HEAD_STRIKE = /\b(hit my head|hit my forehead|head injury|bumped my head|golpe(o|e)? (en )?la cabeza|se golpeo la cabeza|me golpee la (cabeza|frente))/;

const alert = (id: string, kind: Alert["kind"], trigger: string, en: string, es: string): Alert => ({ id, kind, trigger, message: { en, es } });

export function checkTurn(transcript: string, speaker: "patient" | "clinician", profile: PatientProfile | undefined, unverified: SectionId[] = []): Alert[] {
  if (!profile) return [];
  const out: Alert[] = [];
  const allergies = profile.allergies ?? [];
  const medications = profile.medications ?? [];

  // 1. The clinician names a drug or substance the patient is allergic to.
  if (speaker === "clinician") {
    for (const a of allergies) {
      const hit = allergenTerms(a.allergen, a.crossReactiveTerms).find((term) => hasWord(transcript, term));
      if (hit) {
        const sevEs = a.severity === "severe" ? "grave" : a.severity === "moderate" ? "moderada" : "leve";
        out.push(
          alert(
            `alert-allergy-${a.allergen}`,
            "allergy",
            hit,
            `Allergy alert: the profile lists a ${a.severity} ${allergenEn[a.allergen].toLowerCase()} allergy, and "${hit}" was just mentioned. Please confirm before giving it.`,
            `Alerta de alergia: el perfil indica alergia ${sevEs} a ${allergenEs[a.allergen].toLowerCase()} y se acaba de mencionar "${hit}". Confirme antes de administrarlo.`,
          ),
        );
      }
    }
  }

  if (speaker === "patient") {
    // 2. The patient states an allergy the approved profile does not list.
    for (const c of claimedAllergens(transcript)) {
      const listed = allergies.some((a) => a.allergen === c.code || allergenTerms(a.allergen, a.crossReactiveTerms).some((t) => norm(t) === norm(c.said)));
      if (!listed) {
        const none = allergies.length === 0;
        out.push(
          alert(
            `conflict-allergy-${c.code}`,
            "profile",
            c.said,
            `The patient said they are allergic to ${c.said}, but the saved profile ${none ? "lists no medication allergies" : "does not list it"}. Please review.`,
            `El paciente dijo que es alérgico a ${c.said}, pero el perfil guardado ${none ? "no registra alergias a medicamentos" : "no lo incluye"}. Favor de revisar.`,
          ),
        );
      }
    }
    // 3. The patient denies allergies or medications that the profile lists.
    if (allergies.length > 0 && deniesAllergies(transcript)) {
      out.push(
        alert(
          "conflict-allergy-denied",
          "profile",
          "no allergies",
          `The patient said they have no allergies, but the saved profile lists: ${allergies.map((a) => allergenEn[a.allergen]).join(", ")}. Please review.`,
          `El paciente dijo que no tiene alergias, pero el perfil guardado indica: ${allergies.map((a) => allergenEs[a.allergen]).join(", ")}. Favor de revisar.`,
        ),
      );
    }
    if (medications.length > 0 && deniesMedications(transcript)) {
      const list = medications.map((m) => m.name).join(", ");
      out.push(
        alert(
          "conflict-meds-denied",
          "profile",
          "no medications",
          `The patient said they take no medications, but the saved profile lists: ${list}. Please review.`,
          `El paciente dijo que no toma medicamentos, pero el perfil guardado indica: ${list}. Favor de revisar.`,
        ),
      );
    }
  }

  // 4. A spoken blood type that differs from the profile.
  const b = norm(transcript).match(BLOOD);
  if (b && profile.bloodType && profile.bloodType !== "unknown") {
    const said = `${b[1].toUpperCase()}${/neg|-/.test(b[2]) ? "-" : "+"}`;
    if (said !== profile.bloodType) {
      out.push(
        alert(
          "conflict-blood-type",
          "profile",
          b[0],
          `Blood type ${said} was just said, but the saved profile lists ${profile.bloodType}. Please review.`,
          `Se mencionó tipo de sangre ${said}, pero el perfil guardado indica ${profile.bloodType}. Favor de revisar.`,
        ),
      );
    }
  }

  // 5. The patient reports a head strike while on a blood thinner.
  const anticoag = medications.find((m) => m.alertClass === "anticoagulant" || m.alertClass === "antiplatelet");
  if (speaker === "patient" && anticoag && HEAD_STRIKE.test(norm(transcript))) {
    out.push(
      alert(
        "alert-anticoagulant-head",
        "anticoagulant",
        "head",
        `Alert: the patient takes ${anticoag.name}, a blood thinner, and reported a head strike. Bleeding risk is higher.`,
        `Alerta: el paciente toma ${anticoag.name}, un anticoagulante, y reportó un golpe en la cabeza. Mayor riesgo de sangrado.`,
      ),
    );
  }

  // 6. A turn that leans on an unverified (insurance-imported) section.
  if (out.length === 0 && unverified.length > 0) {
    const t = norm(transcript);
    const touches =
      (unverified.includes("allergies") && /allerg|alerg/.test(t)) ||
      (unverified.includes("medications") && /medic|pill|dose|dosis|pastilla/.test(t)) ||
      (unverified.includes("bloodType") && /blood type|tipo de sangre/.test(t));
    if (touches) {
      out.push(
        alert(
          "unverified-reference",
          "profile",
          "",
          "This part of the profile came from an insurance upload and is unverified. Please confirm with the patient.",
          "Esta parte del perfil proviene de una carga del seguro y no está verificada. Confírmelo con el paciente.",
        ),
      );
    }
  }

  return out;
}

/** Two profile alerts about the same thing: same id, or one trigger contains the other ("penicillin" / "allergic to penicillin"). */
function sameProfileTopic(a: Alert, b: Alert): boolean {
  if (a.id === b.id) return true;
  const x = norm(a.trigger).trim();
  const y = norm(b.trigger).trim();
  return x.length > 2 && y.length > 2 && (x.includes(y) || y.includes(x));
}

/**
 * Merge alert lists, earlier lists first (code checks before Claude, earlier
 * turns before later ones). A later allergy or anticoagulant alert is dropped
 * when one of the same kind is present; profile alerts merge by topic.
 */
export function mergeAlerts(...lists: Alert[][]): Alert[] {
  const out: Alert[] = [];
  for (const a of lists.flat()) {
    const dup = a.kind === "profile" ? out.some((x) => x.kind === "profile" && sameProfileTopic(x, a)) : out.some((x) => x.kind === a.kind);
    if (!dup) out.push(a);
  }
  return out;
}
