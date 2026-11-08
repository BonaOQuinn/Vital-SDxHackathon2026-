// Language handling for the summary reports. Vital is not limited to English
// and Spanish: a report is offered in the languages spoken in that
// conversation (any language the ElevenLabs voice stack handles). Codes are
// BCP 47, e.g. "es", "fr", "pt-BR". The demo session is English and Spanish.
//
// Note for the data types: `Lang` in src/data/types.ts is "en" | "es" today.
// It should widen to a language code string so other languages flow through.

export type LangCode = string;

/** "es-MX" -> "es". */
export function baseLang(code: LangCode): string {
  return code.split("-")[0].toLowerCase();
}

function displayNames(inLang: LangCode): Intl.DisplayNames | null {
  try {
    return new Intl.DisplayNames([inLang], { type: "language" });
  } catch {
    return null;
  }
}

/** The language's name in another language, e.g. ("es", "en") -> "Spanish". */
export function languageName(code: LangCode, inLang: LangCode = "en"): string {
  return displayNames(inLang)?.of(code) ?? code;
}

/** The language's own name, capitalized, e.g. "es" -> "Español", "fr" -> "Français". */
export function nativeName(code: LangCode): string {
  const name = languageName(code, code);
  return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
}

/**
 * Locale for speech recognition and read-aloud. Regional defaults for the
 * demo (Mexico for Spanish); other codes pass through unchanged.
 */
export function speechLocale(code: LangCode): string {
  const regional: Record<string, string> = { es: "es-MX", en: "en-US", pt: "pt-BR", fr: "fr-FR", zh: "zh-CN" };
  return code.includes("-") ? code : (regional[baseLang(code)] ?? code);
}

/** Locale for dates and times in a report. */
export function dateLocale(code: LangCode): string {
  return baseLang(code) === "es" ? "es-MX" : code;
}

/**
 * Pick the best text for a language: exact code, then its base language,
 * then English. Fixed UI wording only exists in some languages for now;
 * report content comes from the backend in each spoken language.
 */
export function pick<T>(byLang: Partial<Record<string, T>>, code: LangCode): T | undefined {
  return byLang[code] ?? byLang[baseLang(code)] ?? byLang.en;
}
