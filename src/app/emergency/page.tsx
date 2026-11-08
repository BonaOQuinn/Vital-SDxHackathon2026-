"use client";

// Emergency directory: search a country, see its ambulance number, call it,
// then open the translator on speaker for the call.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { demoLocation } from "@/data";
import { ChevronLeftIcon } from "@/components/icons";
import { findCountry, flag, searchEmergency, type EmergencyEntry } from "@/data/emergency-numbers";
import { loadCountry, saveCountry } from "@/lib/session-store";

export default function EmergencyPage() {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<EmergencyEntry | null>(null);
  const [suggested, setSuggested] = useState<EmergencyEntry | undefined>(undefined);

  useEffect(() => {
    setSuggested(findCountry(loadCountry()) ?? findCountry(demoLocation.country));
  }, []);

  const results = useMemo(() => searchEmergency(query), [query]);

  function choose(e: EmergencyEntry) {
    saveCountry(e.code);
    setPicked(e);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-[#0e0f11] text-white">
      <header className="sticky top-0 z-10 bg-[#0e0f11]/95 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Link href="/" aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] active:bg-white/10">
            <ChevronLeftIcon />
          </Link>
          <h1 className="text-[20px] font-bold">Emergency numbers</h1>
        </div>
        <label className="mt-3 flex h-12 items-center gap-2 rounded-2xl bg-white/[0.08] px-4 focus-within:ring-2 focus-within:ring-[#8ab4f8]">
          <SearchIcon />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search country · Buscar país"
            aria-label="Search country"
            className="min-w-0 flex-1 bg-transparent text-[17px] text-white placeholder:text-white/40 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search" className="text-[15px] text-white/50">
              Clear
            </button>
          )}
        </label>
      </header>

      {!query && suggested && (
        <section className="px-4 pb-2">
          <p className="px-1 pb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-white/50">Where you are</p>
          <button onClick={() => choose(suggested)} className="flex w-full items-center gap-3 rounded-2xl bg-[#3b1d1d] p-4 text-left active:opacity-80">
            <span className="text-[30px] leading-none">{flag(suggested.code)}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-semibold">{suggested.name}</span>
              <span className="block text-[14px] text-white/60">Ambulance · Ambulancia</span>
            </span>
            <span className="rounded-full bg-[#e5332a] px-4 py-2 text-[20px] font-bold tabular-nums">{suggested.medical}</span>
          </button>
        </section>
      )}

      <ul className="flex-1 px-4 pb-8" aria-label="Countries">
        {!query && <li className="px-1 pt-4 pb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-white/50">All countries</li>}
        {results.map((e) => (
          <li key={e.code}>
            <button onClick={() => choose(e)} className="flex w-full items-center gap-3 border-b border-white/[0.06] px-1 py-3.5 text-left active:bg-white/[0.04]">
              <span className="text-[26px] leading-none">{flag(e.code)}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px]">{e.name}</span>
                {e.nameEs !== e.name && <span className="block text-[13px] text-white/45">{e.nameEs}</span>}
              </span>
              <span className="text-right">
                <span className="block text-[19px] font-semibold tabular-nums">{e.medical}</span>
                {e.general && <span className="block text-[12px] text-white/45">Also {e.general}</span>}
              </span>
            </button>
          </li>
        ))}
        {results.length === 0 && (
          <li className="px-1 py-8 text-center text-[15px] text-white/60">
            Not in the list. From a mobile phone, <b className="text-white">112</b> connects to emergency services in most countries.
          </li>
        )}
      </ul>

      {picked && <CallSheet entry={picked} onClose={() => setPicked(null)} />}
    </main>
  );
}

function CallSheet({ entry, onClose }: { entry: EmergencyEntry; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/60" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Call ${entry.name}`}>
      <div className="w-full max-w-[480px] rounded-t-[28px] bg-[#1b1c1f] px-5 pt-3 pb-[max(env(safe-area-inset-bottom),20px)]" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
        <div className="flex items-center gap-3">
          <span className="text-[40px] leading-none">{flag(entry.code)}</span>
          <div>
            <p className="text-[22px] font-bold">{entry.name}</p>
            <p className="text-[15px] text-white/60">Ambulance · Ambulancia{entry.general ? ` · Also ${entry.general}` : ""}</p>
          </div>
        </div>

        <a href={`tel:${entry.medical}`} className="mt-5 flex h-16 items-center justify-center gap-2 rounded-2xl bg-[#e5332a] text-[22px] font-bold active:opacity-85">
          <PhoneIcon /> Call {entry.medical}
        </a>
        <Link href="/conversation?call=1" className="mt-3 flex h-14 items-center justify-center rounded-2xl bg-white/[0.08] text-[17px] font-semibold active:bg-white/[0.12]">
          Open the translator for this call
        </Link>
        <p className="mt-3 text-[13px] leading-snug text-white/55">
          Put the call on speaker, then open the translator. Vital listens to both of you and says each side in the other language.
        </p>
        <button onClick={onClose} className="mt-3 h-11 w-full text-[15px] text-white/60">
          Cancel
        </button>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className="shrink-0 text-white/50" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
    </svg>
  );
}
