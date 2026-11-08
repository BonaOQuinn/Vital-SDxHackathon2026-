"use client";

// Every statement Vital delivers carries a "Source" button. Tapping it opens a
// sheet with the exact conversation line(s) or profile field(s) it came from.
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { PatientProfile } from "@/data";
import { languageName, pick, type LangCode } from "@/lib/languages";
import type { SourceRef, Statement } from "@/lib/report-data";
import { resolveSource } from "@/lib/source-resolve";
import type { TranscriptEntry } from "@/lib/summary-source";
import { timeEn } from "@/lib/clinical-format";
import { Sheet } from "./Sheet";

interface Ctx {
  open: (sources: SourceRef[]) => void;
  lang: LangCode;
}
const SourcesContext = createContext<Ctx | null>(null);

export function SourcesProvider({
  profile,
  transcript,
  at,
  lang,
  children,
}: {
  profile: PatientProfile;
  transcript: TranscriptEntry[];
  at: string;
  lang: LangCode;
  children: ReactNode;
}) {
  const [shown, setShown] = useState<SourceRef[] | null>(null);
  const close = useCallback(() => setShown(null), []);
  const resolved = (shown ?? []).map((ref) => resolveSource(ref, { profile, transcript, at }, lang)).filter((r) => r !== null);

  return (
    <SourcesContext.Provider value={{ open: setShown, lang }}>
      {children}
      <Sheet title="Where this came from" open={shown !== null} onClose={close} z="z-50">
        <ul className="flex flex-col gap-3 pb-4">
          {resolved.map((r, i) =>
            r.kind === "turn" ? (
              <li key={i} className={`rounded-card p-4 ${r.turn.speaker === "clinician" ? "bg-blue-soft" : "bg-surface"}`}>
                <p className="text-[14px] font-semibold text-ink-2">
                  From the conversation · {r.turn.speaker === "clinician" ? "Medical staff" : "Patient"} · {timeEn(r.at)}
                </p>
                <p className="mt-2 text-[17px] leading-[1.45]" lang={r.turn.source_lang}>
                  “{r.turn.original}”
                </p>
                <p className="mt-0.5 text-[13px] text-ink-2">Said in {languageName(r.turn.source_lang, "en")}</p>
                <p className="mt-3 border-l-2 border-line pl-3 text-[16px] leading-[1.45] text-ink-2">
                  {r.turn.translation}
                </p>
                <p className="mt-0.5 pl-3 text-[13px] text-ink-2">Vital&apos;s translation</p>
              </li>
            ) : (
              <li key={i} className="rounded-card bg-surface p-4">
                <p className="text-[14px] font-semibold text-ink-2">From the medical profile · {r.section}</p>
                <p className="mt-2 text-[17px] font-semibold leading-[1.45]">{r.value}</p>
                {r.detail ? <p className="mt-1 text-[16px] leading-[1.45] text-ink-2">{r.detail}</p> : null}
              </li>
            ),
          )}
        </ul>
      </Sheet>
    </SourcesContext.Provider>
  );
}

/** Small button that opens the sources for one statement. */
export function SourceButton({ sources, label = "Source" }: { sources: SourceRef[]; label?: string }) {
  const ctx = useContext(SourcesContext);
  if (!ctx || sources.length === 0) return null;
  return (
    <button
      type="button"
      onClick={() => ctx.open(sources)}
      className="ml-1.5 inline-flex h-7 translate-y-[-1px] items-center gap-1 rounded-full bg-[#E6E9EF] px-2.5 align-middle text-[13px] font-semibold text-ink-2 active:bg-blue-soft"
      aria-label={`${label}: show where this came from`}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        <path d="M2 3h8M2 6h8M2 9h5" />
      </svg>
      {label}
    </button>
  );
}

/** A statement in the report language, followed by its Source button. */
export function Claim({ statement, className = "" }: { statement: Statement; className?: string }) {
  const ctx = useContext(SourcesContext);
  const lang = ctx?.lang ?? "en";
  const text = pick(statement.text, lang) ?? Object.values(statement.text)[0];
  return (
    <span className={className}>
      {text}
      <SourceButton sources={statement.sources} />
    </span>
  );
}
