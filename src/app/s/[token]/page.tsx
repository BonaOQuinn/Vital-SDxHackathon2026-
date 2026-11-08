import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { AskVital } from "@/components/summary/AskVital";
import { ExpiryGate } from "@/components/summary/ExpiryGate";
import { DoctorReport, EmsReport, NurseReport, PatientReport } from "@/components/summary/reports";
import { ShareActions } from "@/components/summary/ShareActions";
import { SourcesProvider } from "@/components/summary/Sources";
import { SummaryReports, type AudienceReport } from "@/components/summary/SummaryReports";
import { TranscriptView } from "@/components/summary/TranscriptView";
import { getSummaryBundle, type Audience, type SummaryBundle } from "@/lib/summary-source";
import type { LangCode } from "@/lib/languages";

export const metadata: Metadata = {
  title: "Clinical summary · Vital",
  robots: { index: false, follow: false },
};

// Public, read-only summary link (CLAUDE.md, step 7 of the architecture).
// The page is in English like the rest of the app. Each reader (doctor, nurse,
// paramedics, patient) gets a short report with only what they act on, in
// Spanish or English. Every statement has a Source button, "Ask Vital" answers
// follow-up questions with sources, and the full transcript is one tap away.
export default function SummaryPage({ params }: PageProps<"/s/[token]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-bg" />}>
      {params.then(({ token }) => (
        <SummaryContent token={token} />
      ))}
    </Suspense>
  );
}

/** One report in one language: sources, collapsed transcript, disclaimer, Ask Vital. */
function Report({ bundle, id, lang, disclaimer, children }: { bundle: SummaryBundle; id: Audience; lang: LangCode; disclaimer: string; children: ReactNode }) {
  const generatedAt = bundle.reports.doctor.es?.generatedAt ?? bundle.transcript.at(-1)?.at ?? "";
  return (
    <SourcesProvider profile={bundle.profile} transcript={bundle.transcript} at={generatedAt} lang={lang}>
      {children}
      <details className="group mt-6 rounded-card bg-surface">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 text-[17px] font-semibold">
          Full transcript ({bundle.transcript.length} turns)
          <span className="text-blue group-open:hidden">Show</span>
          <span className="hidden text-blue group-open:inline">Hide</span>
        </summary>
        <div className="px-4 pb-4">
          <TranscriptView entries={bundle.transcript} lang={lang} anchorId={`transcript-${id}-${lang}`} />
        </div>
      </details>
      <p className="mt-4 text-[14px] leading-[1.5] text-ink-2">{disclaimer}</p>
      <div className="mt-6">
        <ShareActions lang="en" />
      </div>
      <AskVital lang={lang} />
    </SourcesProvider>
  );
}

function SummaryContent({ token }: { token: string }) {
  const bundle = getSummaryBundle(token);

  if (!bundle) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center px-6 text-center">
        <p className="text-[22px] font-bold">We couldn&apos;t find this summary.</p>
        <p className="mt-2 text-[17px] text-ink-2">Check the link, or ask the patient to share it again.</p>
      </main>
    );
  }

  const { doctor, nurse, ems, patient } = bundle.reports;
  const vitals = doctor.es?.vitals ?? doctor.en?.vitals ?? [];
  const pain = nurse.es?.painScore ?? nurse.en?.painScore;
  const generatedAt = doctor.es?.generatedAt ?? doctor.en?.generatedAt ?? "";
  const common = { profile: bundle.profile, generatedAt, vitals };

  // One version per language the report exists in (the languages spoken in the
  // conversation). Nothing here is limited to Spanish and English.
  function versions(id: Audience, byLang: Partial<Record<LangCode, { disclaimer: string }>>, render: (lang: LangCode) => ReactNode) {
    const out: Partial<Record<LangCode, ReactNode>> = {};
    for (const lang of Object.keys(byLang)) {
      const s = byLang[lang];
      if (s) {
        out[lang] = (
          <Report bundle={bundle!} id={id} lang={lang} disclaimer={s.disclaimer}>
            {render(lang)}
          </Report>
        );
      }
    }
    return out;
  }

  const reports: AudienceReport[] = [
    { id: "doctor", label: "Doctor", defaultLang: bundle.staffLang, byLang: versions("doctor", doctor, (lang) => <DoctorReport {...common} lang={lang} />) },
    { id: "nurse", label: "Nurse", defaultLang: bundle.staffLang, byLang: versions("nurse", nurse, (lang) => <NurseReport {...common} lang={lang} pain={pain} />) },
    { id: "ems", label: "Paramedics", defaultLang: bundle.staffLang, byLang: versions("ems", ems, (lang) => <EmsReport {...common} lang={lang} pain={pain} />) },
    { id: "patient", label: "Patient", defaultLang: bundle.patientLang, byLang: versions("patient", patient, () => <PatientReport generatedAt={generatedAt} />) },
  ];

  return (
    <ExpiryGate expiresAt={bundle.expiresAt}>
      <header className="sticky top-0 z-10 border-b border-line bg-bg/95 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-12 max-w-[640px] items-center justify-between px-5">
          <span className="text-[18px] font-bold">Vital</span>
          <span className="text-[15px] text-ink-2">Clinical summary</span>
        </div>
      </header>
      <main className="mx-auto max-w-[640px] px-5 pt-4 pb-32">
        <SummaryReports reports={reports} />
      </main>
    </ExpiryGate>
  );
}
