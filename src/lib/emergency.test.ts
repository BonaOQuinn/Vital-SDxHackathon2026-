import { test } from "node:test";
import assert from "node:assert/strict";
import { emergencyNumber } from "./emergency";

test("Mexico is 911", () => {
  assert.deepEqual(emergencyNumber("MX"), { country: "MX", number: "911", isFallback: false });
});

test("lookup ignores case and spaces", () => {
  assert.equal(emergencyNumber(" mx ").number, "911");
  assert.equal(emergencyNumber("gb").number, "999");
});

test("unknown or missing country falls back to 112 and says so", () => {
  assert.deepEqual(emergencyNumber("ZZ"), { country: "ZZ", number: "112", isFallback: true });
  assert.equal(emergencyNumber(undefined).isFallback, true);
});
