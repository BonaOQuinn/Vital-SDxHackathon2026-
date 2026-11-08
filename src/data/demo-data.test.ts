// Sanity checks for the demo fixtures. Run with: npx tsx --test src/data/demo-data.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { demoAsrKeywords, demoProfile } from "./demo-profile";
import { demoTurns, injuryTimeline, finalInjuryRecord } from "./demo-session";
import { demoSummaries, doctorSummary } from "./demo-summaries";

test("stored metric values match what the user entered", () => {
  assert.ok(Math.abs(demoProfile.weight.kg - demoProfile.weight.entered.value * 0.45359237) < 0.01);
  const { ft, in: inches } = demoProfile.height.entered;
  assert.ok(Math.abs(demoProfile.height.cm - (ft * 12 + inches) * 2.54) < 0.01);
});

test("ASR keyword list fits Scribe's limit and includes every medication", () => {
  assert.ok(demoAsrKeywords.length <= 50);
  for (const m of demoProfile.medications) assert.ok(demoAsrKeywords.includes(m.name));
});

test("the script fires both alerts", () => {
  const kinds = finalInjuryRecord.alerts.map((a) => a.kind);
  assert.deepEqual(kinds, ["anticoagulant", "allergy"]);
});

test("the allergy alert trigger is a cross-reactive term of the profile allergy", () => {
  const terms = demoProfile.allergies[0].crossReactiveTerms;
  for (const t of demoTurns) for (const a of t.alerts) if (a.kind === "allergy") assert.ok(terms.includes(a.trigger));
});

test("injury timeline has one snapshot per turn and versions increase", () => {
  assert.equal(injuryTimeline.length, demoTurns.length);
  injuryTimeline.forEach((r, i) => assert.equal(r.version, i));
});

test("the apixaban question is answered by turn 4", () => {
  const q = injuryTimeline[4].openQuestions.find((q) => q.id === "q-last-apixaban");
  assert.equal(q?.answeredTurn, 4);
  assert.equal(injuryTimeline[3].openQuestions.find((q) => q.id === "q-last-apixaban")?.answer, undefined);
});

test("drug names stay verbatim in the doctor summary", () => {
  const text = doctorSummary.currentMedications.join(" ");
  for (const m of demoProfile.medications) assert.ok(text.includes(m.name), m.name);
});

test("one summary per audience, in the right language", () => {
  const got = demoSummaries.map((s) => `${s.audience}:${s.language}`);
  assert.deepEqual(got, ["doctor:es", "patient:en", "nurse:es", "ems:es"]);
});
