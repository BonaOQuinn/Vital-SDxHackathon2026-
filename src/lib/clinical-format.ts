// Clinician-facing formatting (Spanish, kg and cm first, always with units).
// See CLAUDE.md: "Kilograms first, always with the unit."
import type { Height, VitalSign, Weight } from "@/data";
import { formatCm, formatFtIn, formatKg, formatLb } from "./units";
import { baseLang, dateLocale, type LangCode } from "./languages";

/** "82 kg (180 lb)" when entered in lb, otherwise "82 kg". */
export function weightClinician(w: Weight): string {
  return w.entered.unit === "lb" ? `${formatKg(w.kg)} (${formatLb(w.entered.value)})` : formatKg(w.kg);
}

/** "178 cm (5 ft 10 in)" when entered in ft/in, otherwise "178 cm". */
export function heightClinician(h: Height): string {
  return h.entered.unit === "ft_in" ? `${formatCm(h.cm)} (${formatFtIn(h.entered.ft, h.entered.in)})` : formatCm(h.cm);
}

/** Whole years between a YYYY-MM-DD birth date and an ISO timestamp. */
export function ageAt(dateOfBirth: string, atIso: string): number {
  const [y, m, d] = dateOfBirth.split("-").map(Number);
  const at = new Date(atIso);
  let age = at.getUTCFullYear() - y;
  const beforeBirthday = at.getUTCMonth() + 1 < m || (at.getUTCMonth() + 1 === m && at.getUTCDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

/** "96 lpm", "148/92 mmHg", "98 %". Numbers verbatim. */
export function vitalValueEs(v: VitalSign): string {
  const value = typeof v.value === "number" ? String(v.value) : `${v.value.systolic}/${v.value.diastolic}`;
  const unit = v.unit === "bpm" ? "lpm" : v.unit === "breaths/min" ? "rpm" : v.unit === "points" ? "puntos" : v.unit;
  return unit === "%" ? `${value} %` : `${value} ${unit}`;
}

/** Vital sign value in the report language: "96 bpm" or "96 lpm". */
export function vitalValue(v: VitalSign, lang: LangCode): string {
  if (baseLang(lang) === "es") return vitalValueEs(v);
  const value = typeof v.value === "number" ? String(v.value) : `${v.value.systolic}/${v.value.diastolic}`;
  return v.unit === "%" ? `${value} %` : `${value} ${v.unit}`;
}

/** Date and time in the report language, in the clinic's time zone. */
export function dateTime(iso: string, lang: LangCode, timeZone = "America/Tijuana"): string {
  if (baseLang(lang) === "es") return dateTimeEs(iso, timeZone);
  return new Intl.DateTimeFormat(dateLocale(lang), { dateStyle: "long", timeStyle: "short", timeZone }).format(new Date(iso));
}

/** "8 de noviembre de 2026, 15:14" in the clinic's time zone. */
export function dateTimeEs(iso: string, timeZone = "America/Tijuana"): string {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeStyle: "short", timeZone }).format(new Date(iso));
}

/** "3:10:20 p.m." in the clinic's time zone, for transcript lines. */
export function timeEs(iso: string, timeZone = "America/Tijuana"): string {
  return new Intl.DateTimeFormat("es-MX", { timeStyle: "medium", timeZone }).format(new Date(iso));
}

/** "3:10:20 PM" for the patient's English transcript. */
export function timeEn(iso: string, timeZone = "America/Tijuana"): string {
  return new Intl.DateTimeFormat("en-US", { timeStyle: "medium", timeZone }).format(new Date(iso));
}

/** "November 8, 2026 at 3:14 PM" for the patient's English summary. */
export function dateTimeEn(iso: string, timeZone = "America/Tijuana"): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short", timeZone }).format(new Date(iso));
}

/** Patient-facing: what they entered first, e.g. "180 lb (82 kg)". */
export function weightPatient(w: Weight): string {
  return w.entered.unit === "lb" ? `${formatLb(w.entered.value)} (${formatKg(w.kg)})` : formatKg(w.kg);
}

/** Patient-facing: what they entered first, e.g. "5 ft 10 in (178 cm)". */
export function heightPatient(h: Height): string {
  return h.entered.unit === "ft_in" ? `${formatFtIn(h.entered.ft, h.entered.in)} (${formatCm(h.cm)})` : formatCm(h.cm);
}

/** "+1 619 555 0142" from E.164, for North American numbers; otherwise as stored. */
export function phoneDisplay(e164: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `+1 ${m[1]} ${m[2]} ${m[3]}` : e164;
}
