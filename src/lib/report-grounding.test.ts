// Run with: npx tsx --test src/lib/report-grounding.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { demoTurns, finalInjuryRecord } from "../data/demo-session";
import { CLOSING_LINE, MAX_ANSWERS, capIntake } from "./intake";
import { reportItems, resolveGrounding } from "./report-grounding";

const items = reportItems(finalInjuryRecord);

test("an empty or missing record gives no items", () => {
  assert.deepEqual(reportItems({}), []);
  assert.deepEqual(reportItems(null), []);
});

test("every report section becomes a citable item with a unique id", () => {
  for (const kind of ["mechanism", "injury", "symptom", "vital", "treatment"]) assert.ok(items.some((i) => i.kind === kind), kind);
  assert.equal(new Set(items.map((i) => i.id)).size, items.length);
});

test("blood pressure keeps its numbers and unit", () => {
  assert.equal(items.find((i) => i.id === "vital-blood_pressure")?.text.en, "Blood pressure: 148/92 mmHg");
});

test("a citation carries the words it was recorded from", () => {
  const [citation] = resolveGrounding(["inj-wrist"], items, demoTurns);
  assert.equal(citation.turn, 6);
  assert.equal(citation.quote, demoTurns.find((t) => t.index === 6)?.original);
});

test("ids Claude invents are dropped and repeats collapse", () => {
  assert.deepEqual(resolveGrounding(["made-up"], items, demoTurns), []);
  assert.equal(resolveGrounding(["inj-wrist", "inj-wrist", "made-up"], items, demoTurns).length, 1);
});

test("citations are capped so the screen stays readable", () => {
  assert.equal(resolveGrounding(items.map((i) => i.id), items, demoTurns).length, 3);
});

test("the interview stops at the limit even if Claude keeps asking", () => {
  const asking = { reply: "One more?", done: false };
  assert.deepEqual(capIntake(asking, MAX_ANSWERS - 1), asking);
  assert.deepEqual(capIntake(asking, MAX_ANSWERS), { reply: CLOSING_LINE, done: true });
  assert.equal(capIntake({ reply: "Thanks.", done: true }, MAX_ANSWERS).reply, "Thanks.");
});
