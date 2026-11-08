// Unit conversion in plain code (never the LLM). See CLAUDE.md:
// store metric, keep what the user entered, show kg and cm first to clinicians.

/** Exact international definitions. */
export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function ftInToCm(ft: number, inches: number): number {
  return (ft * 12 + inches) * CM_PER_IN;
}

/** Whole inches, carrying 12 in into the next foot. */
export function cmToFtIn(cm: number): { ft: number; in: number } {
  const totalIn = Math.round(cm / CM_PER_IN);
  return { ft: Math.floor(totalIn / 12), in: totalIn % 12 };
}

export function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** "82 kg". Always with the unit. */
export function formatKg(kg: number): string {
  return `${Math.round(kg)} kg`;
}

/** "180 lb". Always with the unit. */
export function formatLb(lb: number): string {
  return `${Math.round(lb)} lb`;
}

/** "178 cm". Always with the unit. */
export function formatCm(cm: number): string {
  return `${Math.round(cm)} cm`;
}

/** "5 ft 10 in". Always with the unit. */
export function formatFtIn(ft: number, inches: number): string {
  return `${ft} ft ${inches} in`;
}
