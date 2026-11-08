// Suggests where to go for care. Plain code, never the LLM: the level of care
// comes from fixed rules over the injury record and profile, and the options
// come only from map data, so a facility can never be invented.
//
// The rules only escalate. They restate what was recorded and do not diagnose.
import type { InjuryRecord, PatientProfile, Source } from "../data/types";
import type { SourceRef, Statement } from "./report-data";
import { formatDistance } from "./units";

export type CareLevel = "emergency_department" | "hospital" | "clinic";

export interface CareAssessment {
  level: CareLevel;
  /** Why this level was suggested. Each one points back to its source. */
  reasons: Statement[];
  /** Other recorded facts pointing to hospital care. They did not set the level. */
  alsoRecorded: Statement[];
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Facility extends GeoPoint {
  id: string;
  name: string;
  kind: "hospital" | "clinic";
  /** True only when the map data lists an emergency department. */
  emergency: boolean;
  phone?: string;
}

export interface RankedFacility extends Facility {
  /** Straight-line distance, not driving distance. */
  distanceKm: number;
}

export interface SuggestedFacility extends RankedFacility {
  /** Why this place was chosen, one point per line. */
  why: Statement[];
  /** Every conversation line, profile field and map record behind `why`, without repeats. */
  citations: SourceRef[];
}

export interface CareRouteResponse extends CareAssessment {
  options: SuggestedFacility[];
  /** "unavailable" means the lookup failed, which is different from finding nothing. */
  dataSource: "snapshot" | "live" | "unavailable";
  /** Local emergency number, when known for this location. */
  emergencyNumber: string | null;
}

/** May be an empty object: a session has no injury record until extraction runs. */
export type RecordedCase = Partial<Pick<InjuryRecord, "injuries" | "vitals" | "mechanism" | "interventions">>;

const STAFF_SENT_TO_HOSPITAL = /hospital|traslad|transfer/i;

const fromTurn = (s: Source): SourceRef => ({ kind: "turn", turn: s.updatedTurn ?? s.turn });
const statement = (en: string, es: string, sources: SourceRef[]): Statement => ({ text: { en, es }, sources });

export function assessCare(profile: Pick<PatientProfile, "medications">, record: RecordedCase): CareAssessment {
  const injuries = record.injuries ?? [];
  const vitals = record.vitals ?? [];
  const emergency: Statement[] = [];
  const hospital: Statement[] = [];

  const mechanism = record.mechanism;
  if (mechanism?.lossOfConsciousness === "yes") {
    emergency.push(statement("A loss of consciousness was recorded.", "Se registró una pérdida del conocimiento.", [fromTurn(mechanism.source)]));
  }

  for (const injury of injuries) {
    if (injury.bleeding === "active") {
      emergency.push(statement("Active bleeding was recorded.", "Se registró sangrado activo.", [fromTurn(injury.source)]));
    }
  }

  const headInjury = injuries.find((i) => i.type === "head_strike" || i.region === "head");
  const bloodThinner = profile.medications.find((m) => m.alertClass === "anticoagulant" || m.alertClass === "antiplatelet");
  if (headInjury && bloodThinner) {
    emergency.push(
      statement(
        `You hit your head and your profile lists ${bloodThinner.name}, a blood thinner.`,
        `Se registró un golpe en la cabeza y el perfil indica ${bloodThinner.name}, un anticoagulante o antiagregante.`,
        [fromTurn(headInjury.source), { kind: "profile", section: "medications", key: bloodThinner.name }],
      ),
    );
  } else if (headInjury) {
    hospital.push(statement("A head injury was recorded.", "Se registró una lesión en la cabeza.", [fromTurn(headInjury.source)]));
  }

  for (const vital of vitals) {
    if (typeof vital.value !== "number") continue;
    if (vital.kind === "gcs" && vital.value < 15) {
      emergency.push(statement(`A Glasgow score of ${vital.value} points was recorded.`, `Se registró una escala de Glasgow de ${vital.value} puntos.`, [fromTurn(vital.source)]));
    }
    if (vital.kind === "spo2" && vital.value < 92) {
      emergency.push(statement(`An oxygen level of ${vital.value} % was recorded.`, `Se registró una saturación de oxígeno de ${vital.value} %.`, [fromTurn(vital.source)]));
    }
  }

  for (const injury of injuries) {
    if (injury.type === "possible_fracture") {
      hospital.push(statement("A possible fracture was recorded, which usually needs imaging.", "Se registró una posible fractura, que suele requerir estudios de imagen.", [fromTurn(injury.source)]));
    }
    if (injury.type === "burn") {
      hospital.push(statement("A burn was recorded.", "Se registró una quemadura.", [fromTurn(injury.source)]));
    }
  }

  for (const step of record.interventions ?? []) {
    if (step.source.reportedBy === "clinician" && STAFF_SENT_TO_HOSPITAL.test(`${step.description.en} ${step.description.es}`)) {
      hospital.push(statement(`Medical staff said: ${step.description.en}`, `El personal médico indicó: ${step.description.es}`, [fromTurn(step.source)]));
    }
  }

  if (emergency.length > 0) return { level: "emergency_department", reasons: emergency, alsoRecorded: hospital };
  if (hospital.length > 0) return { level: "hospital", reasons: hospital, alsoRecorded: [] };
  if (injuries.length === 0) {
    // Nothing recorded is not the same as nothing wrong, so do not suggest the lowest level.
    return {
      level: "hospital",
      alsoRecorded: [],
      reasons: [statement("No injury details have been recorded yet, so Vital suggests a hospital.", "Aún no se han registrado detalles de la lesión, por lo que Vital sugiere un hospital.", [])],
    };
  }
  return {
    level: "clinic",
    alsoRecorded: [],
    reasons: [statement("Only minor injuries were recorded.", "Solo se registraron lesiones menores.", injuries.map((i) => fromTurn(i.source)))],
  };
}

// ---------- Map data ----------

export interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

// OpenStreetMap tags some of these as hospitals. Sending someone to one would be
// worse than leaving it out, so the name is checked as well as the tag.
const NOT_A_FACILITY = /estacionamiento|parking/i;
const NOT_A_HOSPITAL = /enfermer[ií]a|medicina familiar|consultorio|centro de salud/i;
const DUPLICATE_WITHIN_KM = 0.075;

export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(h));
}

/** Turns raw OpenStreetMap elements into usable facilities, dropping unusable ones. */
export function parseOsmFacilities(elements: OsmElement[]): Facility[] {
  const out: Facility[] = [];
  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = tags.name?.trim();
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (!name || lat === undefined || lng === undefined || NOT_A_FACILITY.test(name)) continue;

    const taggedHospital = tags.amenity === "hospital" || tags.healthcare === "hospital";
    const kind = taggedHospital && !NOT_A_HOSPITAL.test(name) ? "hospital" : "clinic";
    const facility: Facility = {
      id: `${el.type}/${el.id}`,
      name,
      lat,
      lng,
      kind,
      emergency: kind === "hospital" && tags.emergency === "yes",
    };
    const phone = (tags.phone ?? tags["contact:phone"])?.split(";")[0].trim();
    if (phone) facility.phone = phone;

    if (!out.some((f) => distanceKm(f, facility) < DUPLICATE_WITHIN_KM)) out.push(facility);
  }
  return out;
}

const LOOKED_FOR: Record<CareLevel, string> = {
  emergency_department: "a hospital emergency department",
  hospital: "a hospital",
  clinic: "a clinic or hospital",
};

const point = (en: string, sources: SourceRef[] = []): Statement => ({ text: { en }, sources });

/** Adds the reasoning and citations shown when someone taps Source on a suggested place. */
export function explainChoices(assessment: CareAssessment, ranked: RankedFacility[]): SuggestedFacility[] {
  const { level, reasons, alsoRecorded } = assessment;
  return ranked.map((facility, i) => {
    const listing = facility.emergency ? "A hospital with an emergency department" : facility.kind === "hospital" ? "A hospital" : "A clinic";
    const widened = (level === "emergency_department" && !facility.emergency) || (level === "hospital" && facility.kind !== "hospital");
    const mapRecord: SourceRef = { kind: "map", name: facility.name, listing, url: `https://www.openstreetmap.org/${facility.id}` };
    const why = [
      point(`Vital looked for ${LOOKED_FOR[level]}.`),
      ...reasons,
      ...alsoRecorded,
      point(
        `OpenStreetMap lists ${facility.name} as ${listing.toLowerCase()}.${widened ? ` Vital found no listed match for ${LOOKED_FOR[level]} nearby, so it widened the search. The map does not confirm this place has what you may need.` : ""}`,
        [mapRecord],
      ),
      point(`${i === 0 ? "It is the closest match Vital found" : "It is the next closest match"}, ${formatDistance(facility.distanceKm)} in a straight line from the location shown.`),
    ];
    const citations = [...new Map(why.flatMap((w) => w.sources).map((s) => [JSON.stringify(s), s])).values()];
    return { ...facility, why, citations };
  });
}

// Each level tries the most suitable group first and widens only if that group is empty.
const SUITABILITY: Record<CareLevel, ((f: Facility) => boolean)[]> = {
  emergency_department: [(f) => f.emergency, (f) => f.kind === "hospital", () => true],
  hospital: [(f) => f.kind === "hospital", () => true],
  clinic: [() => true],
};

/** The closest facilities in the most suitable group available. */
export function rankFacilities(level: CareLevel, origin: GeoPoint, facilities: Facility[], limit = 3): RankedFacility[] {
  const pool = SUITABILITY[level].map((fits) => facilities.filter(fits)).find((group) => group.length > 0) ?? [];
  return pool
    .map((f) => ({ ...f, distanceKm: distanceKm(origin, f) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
