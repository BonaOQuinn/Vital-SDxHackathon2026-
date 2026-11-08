// Round-trip tests for unit conversion (required by CLAUDE.md).
// Run with: npx tsx --test src/lib/units.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { cToF, cmToFtIn, formatC, formatKg, fToC, ftInToCm, kgToLb, lbToKg } from "./units";

test("lb to kg uses the exact factor", () => {
  assert.ok(Math.abs(lbToKg(180) - 81.6466266) < 1e-6);
  assert.equal(formatKg(lbToKg(180)), "82 kg");
});

test("lb to kg to lb round-trips", () => {
  for (const lb of [1, 99.5, 180, 250, 400]) assert.ok(Math.abs(kgToLb(lbToKg(lb)) - lb) < 1e-9);
});

test("ft-in to cm to ft-in round-trips", () => {
  for (let ft = 3; ft <= 7; ft++) {
    for (let inches = 0; inches < 12; inches++) {
      assert.deepEqual(cmToFtIn(ftInToCm(ft, inches)), { ft, in: inches });
    }
  }
});

test("5 ft 10 in is 177.8 cm", () => {
  assert.ok(Math.abs(ftInToCm(5, 10) - 177.8) < 1e-9);
});

test("inches never show as 12", () => {
  assert.deepEqual(cmToFtIn(182.8), { ft: 6, in: 0 });
});

test("°F to °C: known points", () => {
  assert.equal(fToC(32), 0);
  assert.equal(fToC(212), 100);
  assert.equal(formatC(fToC(98.6)), "37.0 °C");
  assert.equal(formatC(fToC(101.3)), "38.5 °C");
});

test("°F to °C to °F round-trips", () => {
  for (const f of [95, 98.6, 100.4, 103, 106]) assert.ok(Math.abs(cToF(fToC(f)) - f) < 1e-9);
});
