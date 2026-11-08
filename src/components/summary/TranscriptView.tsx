// The full conversation, word for word, from the first thing said.
// Originals are verbatim in whatever language was spoken; the translation
// Vital gave is shown under each one. Labels follow the report language
// (Spanish or English today; other languages use English labels).
import type { TranscriptEntry } from "@/lib/summary-source";
import { AlertIcon } from "@/components/icons";
import { timeEn, timeEs } from "@/lib/clinical-format";
import { baseLang, languageName, pick, type LangCode } from "@/lib/languages";

const copy = {
  es: {
    title: "Transcripción completa",
    count: (n: number) => `${n} intervenciones`,
    intro: "Palabra por palabra, en el idioma original, con la traducción que dio Vital.",
    speaker: { patient: "Paciente", clinician: "Personal médico" },
    saidIn: (code: string) => `Dicho en ${languageName(code, "es")}`,
    translation: "Traducción de Vital",
    readBack: "Leído en voz alta para confirmar:",
    time: timeEs,
  },
  en: {
    title: "Full transcript",
    count: (n: number) => `${n} turns`,
    intro: "Word for word, in the language it was spoken, with the translation Vital gave.",
    speaker: { patient: "Patient", clinician: "Medical staff" },
    saidIn: (code: string) => `Said in ${languageName(code, "en")}`,
    translation: "Vital's translation",
    readBack: "Read back aloud to confirm:",
    time: timeEn,
  },
};

export function TranscriptView({ entries, lang, anchorId }: { entries: TranscriptEntry[]; lang: LangCode; anchorId?: string }) {
  if (entries.length === 0) return null;
  const t = pick(copy, lang) ?? copy.en;
  const first = t.time(entries[0].at);
  const last = t.time(entries[entries.length - 1].at);
  const alertLang = baseLang(lang) === "es" ? "es" : "en";

  return (
    <section id={anchorId} className="scroll-mt-28">
      <h2 className="sr-only">{t.title}</h2>
      <p className="mb-3 text-[15px] leading-[1.45] text-ink-2">
        {t.count(entries.length)} · {first} – {last}
        <br />
        {t.intro}
      </p>

      <ol className="flex flex-col gap-2.5">
        {entries.map(({ turn, at }) => {
          const readBack = turn.flagged_terms.filter((f) => f.readBack).map((f) => f.term);
          return (
            <li key={turn.index} className={`rounded-card p-4 ${turn.speaker === "clinician" ? "bg-blue-soft" : "bg-bg"}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-bold">{t.speaker[turn.speaker]}</span>
                <span className="flex-none text-[14px] tabular-nums text-ink-2">{t.time(at)}</span>
              </div>

              <p className="mt-1.5 text-[17px] leading-[1.45]" lang={turn.source_lang}>
                {turn.original}
              </p>
              <p className="mt-0.5 text-[13px] text-ink-2">{t.saidIn(turn.source_lang)}</p>

              <p className="mt-3 border-l-2 border-line pl-3 text-[16px] leading-[1.45] text-ink-2">{turn.translation}</p>
              <p className="mt-0.5 pl-3 text-[13px] text-ink-2">{t.translation}</p>

              {readBack.length > 0 ? (
                <p className="mt-3 text-[14px] text-ink-2">
                  <span className="font-semibold text-ink">{t.readBack}</span> {readBack.join(", ")}
                </p>
              ) : null}

              {turn.alerts.map((a) => (
                <p key={a.id} className="mt-3 flex gap-2 rounded-xl bg-red-soft p-3 text-[15px] font-semibold leading-[1.4] text-red">
                  <AlertIcon size={18} className="mt-0.5 flex-none" />
                  <span>{a.message[alertLang]}</span>
                </p>
              ))}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
