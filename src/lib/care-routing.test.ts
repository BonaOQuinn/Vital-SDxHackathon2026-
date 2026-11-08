// Run with: npx tsx --test src/lib/care-routing.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { demoProfile } from "../data/demo-profile";
import { demoLocation, finalInjuryRecord } from "../data/demo-session";
import { ensenadaOsmElements } from "../data/facilities-ensenada";
import type { Injury, PatientProfile } from "../data/types";
import { assessCare, explainChoices, parseOsmFacilities, rankFacilities, type Facility } from "./care-routing";
import { formatDistance } from "./units";

const source = { reportedBy: "patient", turn: 3 } as const;
const injury = (fields: Partial<Injury>): Injury => ({
  id: "i",
  region: "forearm",
  side: "left",
  type: "abrasion",
  description: { en: "", es: "" },
  source,
  ...fields,
});
const noThinners: PatientProfile = { ...demoProfile, medications: demoProfile.medications.filter((m) => !m.alertClass) };
const facilities = parseOsmFacilities(ensenadaOsmElements);

test("demo case: head strike on apixaban goes to an emergency department, with sources", () => {
  const { level, reasons } = assessCare(demoProfile, finalInjuryRecord);
  assert.equal(level, "emergency_department");
  const reason = reasons.find((r) => r.text.en?.includes("apixaban"));
  assert.ok(reason);
  assert.ok(reason.sources.some((s) => s.kind === "turn"));
  assert.ok(reason.sources.some((s) => s.kind === "profile" && s.section === "medications"));
});

test("same head strike without a blood thinner goes to a hospital", () => {
  assert.equal(assessCare(noThinners, { injuries: [injury({ region: "head", type: "head_strike" })] }).level, "hospital");
});

test("active bleeding and low oxygen escalate to an emergency department", () => {
  assert.equal(assessCare(noThinners, { injuries: [injury({ bleeding: "active" })] }).level, "emergency_department");
  const vitals = [{ kind: "spo2", value: 88, unit: "%", source }] as const;
  assert.equal(assessCare(noThinners, { injuries: [injury({})], vitals: [...vitals] }).level, "emergency_department");
});

test("possible fracture goes to a hospital, minor injury to a clinic", () => {
  assert.equal(assessCare(noThinners, { injuries: [injury({ type: "possible_fracture" })] }).level, "hospital");
  assert.equal(assessCare(noThinners, { injuries: [injury({})] }).level, "clinic");
});

test("an empty record never suggests the lowest level", () => {
  assert.equal(assessCare(demoProfile, {}).level, "hospital");
});

test("map filter drops parking lots and unnamed places and demotes mis-tagged clinics", () => {
  const names = facilities.map((f) => f.name);
  assert.ok(!names.some((n) => /Estacionamiento/.test(n)));
  assert.equal(facilities.length, 8);
  for (const name of ["Enfermería CICESE", "Unidad de medicina familiar #25"]) {
    const f = facilities.find((x) => x.name === name);
    assert.equal(f?.kind, "clinic");
    assert.equal(f?.emergency, false);
  }
});

test("emergency level offers only listed emergency departments, closest first", () => {
  const ranked = rankFacilities("emergency_department", demoLocation, facilities);
  assert.deepEqual(ranked.map((f) => f.name), ["IMSS #8", "Hospital ISSSTECALI", "Hospital General Ensenada"]);
  assert.ok(ranked.every((f) => f.emergency));
});

test("clinic level takes the closest place of any kind", () => {
  assert.equal(rankFacilities("clinic", demoLocation, facilities)[0].name, "Unidad de medicina familiar #25");
});

test("with no listed emergency department it widens to hospitals and stays marked unconfirmed", () => {
  const noEr: Facility[] = [
    { id: "a", name: "Clinic", lat: 1, lng: 1, kind: "clinic", emergency: false },
    { id: "b", name: "Hospital", lat: 2, lng: 2, kind: "hospital", emergency: false },
  ];
  const ranked = rankFacilities("emergency_department", { lat: 1, lng: 1 }, noEr);
  assert.deepEqual(ranked.map((f) => f.name), ["Hospital"]);
  assert.equal(ranked[0].emergency, false);
});

test("each suggested place explains itself and cites the conversation, profile and map", () => {
  const assessment = assessCare(demoProfile, finalInjuryRecord);
  const [first, second] = explainChoices(assessment, rankFacilities(assessment.level, demoLocation, facilities));
  const turns = first.citations.flatMap((c) => (c.kind === "turn" ? [c.turn] : []));
  assert.deepEqual(turns, [2, 6, 11]);
  assert.ok(first.citations.some((c) => c.kind === "profile" && c.key === "apixaban"));
  assert.ok(first.citations.some((c) => c.kind === "map" && c.url === "https://www.openstreetmap.org/node/7212520349"));
  assert.ok(first.why.some((w) => w.text.en?.includes("closest match")));
  assert.ok(second.why.some((w) => w.text.en?.includes("next closest")));
  assert.equal(new Set(first.citations.map((c) => JSON.stringify(c))).size, first.citations.length);
});

test("a clinician's transfer is cited and lifts a minor case to hospital; a patient's words do not", () => {
  const step = (reportedBy: "clinician" | "patient") => ({
    id: "t",
    description: { en: "Transfer to hospital.", es: "Traslado al hospital." },
    source: { reportedBy, turn: 5 },
  });
  const staff = assessCare(noThinners, { injuries: [injury({})], interventions: [step("clinician")] });
  assert.equal(staff.level, "hospital");
  assert.deepEqual(staff.reasons[0].sources, [{ kind: "turn", turn: 5 }]);
  assert.equal(assessCare(noThinners, { injuries: [injury({})], interventions: [step("patient")] }).level, "clinic");
});

test("a widened choice says the map does not confirm it", () => {
  const noEr: Facility[] = [{ id: "way/1", name: "Hospital", lat: 2, lng: 2, kind: "hospital", emergency: false }];
  const assessment = assessCare(noThinners, { injuries: [injury({ bleeding: "active" })] });
  const [choice] = explainChoices(assessment, rankFacilities(assessment.level, { lat: 1, lng: 1 }, noEr));
  assert.ok(choice.why.some((w) => w.text.en?.includes("does not confirm")));
});

test("with nothing recorded the place still explains itself, with no invented conversation citation", () => {
  const assessment = assessCare(demoProfile, {});
  const [choice] = explainChoices(assessment, rankFacilities(assessment.level, demoLocation, facilities));
  assert.ok(choice.why.length > 0);
  assert.ok(!choice.citations.some((c) => c.kind === "turn"));
});

test("distance leads with km and always carries units", () => {
  assert.equal(formatDistance(1.61), "1.6 km (1.0 mi)");
});
