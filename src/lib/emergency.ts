// Emergency number lookup (CLAUDE.md: a small country table, Mexico 911 for the demo).
// Keys are ISO 3166-1 alpha-2 country codes. Unknown countries fall back to 112, which
// works in the EU and on most mobile networks, and the result says it is a fallback.

export interface EmergencyInfo {
  country: string;
  /** Number to dial for police, fire and ambulance. */
  number: string;
  isFallback: boolean;
}

const TABLE: Record<string, string> = {
  MX: "911",
  US: "911",
  CA: "911",
  GB: "999",
  ES: "112",
  FR: "112",
  DE: "112",
  IT: "112",
};

export const FALLBACK_NUMBER = "112";

export function emergencyNumber(country: string | undefined | null): EmergencyInfo {
  const code = (country ?? "").trim().toUpperCase();
  const number = TABLE[code];
  return number
    ? { country: code, number, isFallback: false }
    : { country: code, number: FALLBACK_NUMBER, isFallback: true };
}
