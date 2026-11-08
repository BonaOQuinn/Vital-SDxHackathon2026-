"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Audience } from "@/lib/summary-source";
import { nativeName, type LangCode } from "@/lib/languages";

export interface AudienceReport {
  id: Audience;
  label: string;
  /** Language the report opens in (the reader's language). */
  defaultLang: LangCode;
  /** The report rendered in each language it exists in. */
  byLang: Partial<Record<LangCode, ReactNode>>;
}

/**
 * The page around the reports is in English (the app's language). Each report
 * can be read in Spanish or English and opens in its reader's language.
 * The choice is kept in the address (?for=nurse&lang=es), so "Copy link" and
 * "Share" send exactly the report and language on screen.
 */
export function SummaryReports({ reports }: { reports: AudienceReport[] }) {
  const [audience, setAudience] = useState<Audience>(reports[0].id);
  const [langs, setLangs] = useState<Record<string, LangCode>>(() =>
    Object.fromEntries(reports.map((r) => [r.id, r.defaultLang])),
  );

  // Hold the report until the address is read, so a shared link never
  // flashes the wrong report or language first.
  const [ready, setReady] = useState(false);

  // Read ?for= and ?lang= after mount (Next.js prerenders this page).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const f = q.get("for");
    const l = q.get("lang");
    const match = reports.find((r) => r.id === f);
    /* eslint-disable react-hooks/set-state-in-effect -- the address is only readable after mount */
    if (match) {
      setAudience(match.id);
      if (l && match.byLang[l]) setLangs((cur) => ({ ...cur, [match.id]: l }));
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [reports]);

  if (!ready) return <div className="min-h-[60dvh]" aria-busy="true" />;

  function syncUrl(a: Audience, l: LangCode) {
    const url = new URL(window.location.href);
    url.searchParams.set("for", a);
    url.searchParams.set("lang", l);
    url.hash = "";
    window.history.replaceState(null, "", url);
  }

  function chooseAudience(a: Audience) {
    setAudience(a);
    syncUrl(a, langs[a]);
    window.scrollTo({ top: 0 });
  }

  function chooseLang(l: LangCode) {
    setLangs((cur) => ({ ...cur, [audience]: l }));
    syncUrl(audience, l);
  }

  const current = reports.find((r) => r.id === audience) ?? reports[0];
  const lang = langs[current.id];
  const available = Object.keys(current.byLang).filter((l) => current.byLang[l]);

  return (
    <>
      {/* Reader picker: iOS segmented control, as in the mockup */}
      <div role="tablist" aria-label="Who is this report for?" className="grid grid-cols-4 rounded-[10px] bg-[#E6E8EC] p-[3px]">
        {reports.map((r) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={audience === r.id}
            onClick={() => chooseAudience(r.id)}
            className={`min-h-9 rounded-lg px-1 text-[14px] font-semibold ${
              audience === r.id ? "bg-surface text-ink shadow-[0_1px_3px_rgba(0,0,0,0.12)]" : "text-ink-2"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {available.length === 2 ? (
        // Two languages: "Shown in Español · Show in English"
        <div className="mt-3.5 flex items-center justify-between px-1 text-[15px]">
          <span className="text-ink-2">
            Shown in <span lang={lang}>{nativeName(lang)}</span>
          </span>
          {(() => {
            const otherLang = available.find((l) => l !== lang) ?? available[0];
            return (
              <button type="button" onClick={() => chooseLang(otherLang)} className="min-h-11 font-semibold text-blue">
                Show in <span lang={otherLang}>{nativeName(otherLang)}</span>
              </button>
            );
          })()}
        </div>
      ) : available.length > 2 ? (
        <div className="mt-3.5 flex items-center justify-between gap-3 px-1">
          <span className="text-[15px] text-ink-2">Report language</span>
          <select
            aria-label="Report language"
            value={lang}
            onChange={(e) => chooseLang(e.target.value)}
            className="h-11 rounded-xl border border-line bg-surface px-3 text-[16px] font-semibold"
          >
            {available.map((l) => (
              <option key={l} value={l} lang={l}>
                {nativeName(l)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="mt-4" lang={lang}>
        {current.byLang[lang] ?? current.byLang[available[0]]}
      </div>
    </>
  );
}
