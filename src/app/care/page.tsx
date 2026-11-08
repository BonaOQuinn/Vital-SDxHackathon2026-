"use client";

// Step 2: the report from the talk with Vital, and where to go. Step 3 starts
// from here when the patient arrives.
import Link from "next/link";
import { useEffect, useState } from "react";
import { demoLocation, type InjuryRecord, type PatientProfile, type Turn } from "@/data";
import { Screen } from "@/components/Screen";
import { CareRoute } from "@/components/summary/CareRoute";
import { Claim, SourcesProvider } from "@/components/summary/Sources";
import { emergencyNumber } from "@/lib/emergency";
import { loadProfile } from "@/lib/profile-store";
import { reportItems, type ReportItem, type ReportItemKind } from "@/lib/report-grounding";
import { loadApprovals, loadSession } from "@/lib/session-store";
import { blankProfile } from "@/lib/sharing";

const emergency = emergencyNumber(demoLocation.country);
const startOrigin = { lat: demoLocation.lat, lng: demoLocation.lng, label: `${demoLocation.city} (demo location)` };

const GROUPS: { kind: ReportItemKind; title: string }[] = [
  { kind: "mechanism", title: "What happened" },
  { kind: "injury", title: "Injuries" },
  { kind: "symptom", title: "Symptoms" },
  { kind: "treatment", title: "Treatment so far" },
];

type Loaded =
  | { state: "missing" }
  | { state: "unsaved"; sessionId: string }
  | { state: "ready"; sessionId: string; items: ReportItem[]; transcript: Turn[]; updatedAt: string; profile: PatientProfile; canTranslate: boolean };

async function load(): Promise<Loaded> {
  const stored = loadSession();
  if (!stored?.sessionId) return { state: "missing" };
  const res = await fetch(`/api/session/${stored.sessionId}`, { cache: "no-store" }).catch(() => null);
  if (!res?.ok) return { state: "unsaved", sessionId: stored.sessionId };
  const row = (await res.json()) as { transcript: Turn[]; injury_record: Partial<InjuryRecord>; updated_at: string };
  return {
    state: "ready",
    sessionId: stored.sessionId,
    items: reportItems(row.injury_record),
    transcript: row.transcript,
    updatedAt: row.updated_at,
    profile: loadProfile() ?? blankProfile,
    canTranslate: Object.values(loadApprovals()).some(Boolean),
  };
}

export default function CarePage() {
  const [data, setData] = useState<Loaded | null>(null);

  useEffect(() => {
    void load().then(setData);
  }, []);

  if (!data) return <Screen><p className="mt-10 text-[17px] text-ink-2">Loading your report…</p></Screen>;

  if (data.state === "missing") {
    return (
      <Screen>
        <p className="mt-10 text-[22px] font-bold">No report yet.</p>
        <Link href="/intake" className="mt-4 text-[17px] font-semibold text-blue underline">Tell Vital what happened</Link>
      </Screen>
    );
  }

  if (data.state === "unsaved") {
    return (
      <Screen>
        <p className="mt-10 rounded-card bg-red-soft p-4 text-[17px] font-semibold leading-[1.45] text-red" role="alert">
          Vital couldn&apos;t load your report. If you need urgent help, call {emergency.number}.
        </p>
        <a href={`tel:${emergency.number}`} className="mt-3 flex min-h-14 items-center justify-center rounded-xl bg-red text-[18px] font-bold text-white">Call {emergency.number}</a>
        <Link href="/share" className="mt-3 flex min-h-14 items-center justify-center rounded-xl bg-blue text-[18px] font-bold text-white">I&apos;ve arrived. Start translation</Link>
      </Screen>
    );
  }

  const transcript = data.transcript.map((turn) => ({ turn, at: (turn as Turn & { at?: string }).at ?? data.updatedAt }));

  return (
    <Screen>
      <SourcesProvider profile={data.profile} transcript={transcript} at={data.updatedAt} lang="en">
        <h1 className="mt-6 text-[26px] font-bold leading-[1.15]">Your report</h1>
        <p className="mt-1 text-[15px] text-ink-2">From what you told Vital. It will keep updating when you talk with medical staff.</p>

        {data.items.length === 0 ? <p className="mt-4 rounded-card bg-surface p-4 text-[17px]">Vital hasn&apos;t recorded any details yet.</p> : null}
        {GROUPS.map(({ kind, title }) => {
          const items = data.items.filter((item) => item.kind === kind);
          if (items.length === 0) return null;
          return (
            <section key={kind} className="mt-4">
              <h2 className="mb-2 text-[17px] font-bold">{title}</h2>
              <ul className="rounded-card bg-surface px-4">
                {items.map((item) => (
                  <li key={item.id} className="border-t border-line py-3 text-[17px] leading-[1.45] first:border-t-0">
                    <Claim statement={{ text: { en: item.text.en, es: item.text.es }, sources: [{ kind: "turn", turn: item.source.updatedTurn ?? item.source.turn }] }} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <CareRoute session={data.sessionId} startOrigin={startOrigin} profile={data.profile} />

        <Link href={data.canTranslate ? "/conversation" : "/share"} className="mt-6 mb-8 flex min-h-14 items-center justify-center rounded-xl bg-blue text-[18px] font-bold text-white">
          I&apos;ve arrived. Start translation
        </Link>
      </SourcesProvider>
    </Screen>
  );
}
