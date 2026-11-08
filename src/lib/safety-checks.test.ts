// Profile-consistency checks (no LLM).
// Run with: npx tsx --test src/lib/safety-checks.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { demoProfile } from "@/data";
import { checkTurn, mergeAlerts } from "./safety-checks";

const noAllergies = { ...demoProfile, allergies: [] };
const ids = (...args: Parameters<typeof checkTurn>) => checkTurn(...args).map((a) => a.id);

test("patient states an allergy the profile does not list", () => {
  const [a] = checkTurn("I'm allergic to penicillin, I had anaphylaxis.", "patient", noAllergies);
  assert.equal(a.id, "conflict-allergy-penicillin");
  assert.match(a.message.en, /saved profile lists no medication allergies/);
  assert.match(a.message.es, /penicillin/);
});

test("an allergy that matches the profile is not a conflict", () => {
  assert.deepEqual(ids("I'm allergic to penicillin.", "patient", demoProfile), []);
});

test("patient denies allergies the profile lists", () => {
  assert.deepEqual(ids("I don't have any allergies.", "patient", demoProfile), ["conflict-allergy-denied"]);
});

test("spoken blood type differs from the profile", () => {
  assert.deepEqual(ids("My blood type is A negative.", "patient", demoProfile), ["conflict-blood-type"]);
  assert.deepEqual(ids("My blood type is O positive.", "patient", demoProfile), []);
});

test("head strike on a blood thinner", () => {
  assert.deepEqual(ids("I hit my forehead on the ground.", "patient", demoProfile), ["alert-anticoagulant-head"]);
});

test("a clinician asking about a head strike is not a report of one", () => {
  assert.deepEqual(ids("¿Se golpeó la cabeza? ¿Perdió el conocimiento?", "clinician", demoProfile), []);
});

test("clinician proposes a cross-reactive drug, in Spanish", () => {
  assert.deepEqual(ids("Le voy a dar amoxicilina.", "clinician", demoProfile), ["alert-allergy-penicillin"]);
});

test("unverified section is flagged when it comes up", () => {
  assert.deepEqual(ids("¿Tiene alergia a algún medicamento?", "clinician", noAllergies, ["allergies"]), ["unverified-reference"]);
});

test("no profile, no checks", () => {
  assert.deepEqual(ids("I'm allergic to penicillin.", "patient", undefined), []);
});

test("merge keeps one allergy alert and dedupes profile alerts by id", () => {
  const code = checkTurn("Le voy a dar amoxicilina.", "clinician", demoProfile);
  const llm = [{ id: "alert-allergy-0", kind: "allergy" as const, trigger: "amoxicilina", message: { en: "x", es: "y" } }];
  assert.equal(mergeAlerts(code, llm).length, 1);
});
