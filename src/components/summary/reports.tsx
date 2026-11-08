// The four lean reports. Each shows only what its reader acts on, and every
// statement has a Source button (see Sources.tsx). Report language comes
// from the surrounding SourcesProvider; the page around it stays English.
import type { ReactNode } from "react";
import type { PatientProfile, VitalSign } from "@/data";
import type { LangCode } from "@/lib/languages";
import { AlertIcon } from "@/components/icons";
import { ageAt, dateTime, vitalValue, weightClinician } from "@/lib/clinical-format";
import { copyFor } from "@/lib/report-copy";
import { criticalAlerts, doctorReport, emsReport, nurseReport, painSource, patientReport, vitalsSource, type Statement } from "@/lib/report-data";
import { Claim, SourceButton } from "./Sources";

// ---------- Building blocks ----------

function Title({ children, generatedAt, lang }: { children: ReactNode; generatedAt: string; lang: LangCode }) {
  return (
    <>
      <h1 className="text-[30px] font-bold leading-[1.15] tracking-[-0.01em]">{children}</h1>
      <p className="mt-1 text-[14px] text-ink-2">{dateTime(generatedAt, lang)}</p>
    </>
  );
}

function PatientStrip({ profile, at, lang }: { profile: PatientProfile; at: string; lang: LangCode }) {
  const t = copyFor(lang);
  return (
    <p className="mt-4 rounded-card bg-surface px-4 py-3 text-[16px] leading-[1.5]">
      <span className="font-bold">{profile.fullName}</span>
      <span className="text-ink-2">
        {" · "}
        {ageAt(profile.dateOfBirth, at)} {t.years} · {t.sex(profile.sex)} · {t.bloodType(profile.bloodType)} · {weightClinician(profile.weight)}
      </span>
      <SourceButton
        sources={[
          { kind: "profile", section: "basics", key: "age" },
          { kind: "profile", section: "basics", key: "bloodType" },
          { kind: "profile", section: "basics", key: "weight" },
        ]}
      />
    </p>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-[0.04em] text-ink-3">{title}</h2>
      {children}
    </section>
  );
}

function List({ items }: { items: Statement[] }) {
  return (
    <ul className="rounded-card bg-surface px-4">
      {items.map((st, i) => (
        <li key={i} className="border-t border-line py-3 text-[17px] leading-[1.5] first:border-t-0">
          <Claim statement={st} />
        </li>
      ))}
    </ul>
  );
}

function Alerts({ lang }: { lang: LangCode }) {
  return (
    <ul className="mt-3 flex flex-col gap-2" aria-label={copyFor(lang).criticalAlerts}>
      {criticalAlerts.map((a, i) => (
        <li key={i} className="flex gap-2.5 rounded-xl bg-red-soft px-3.5 py-3 text-[16px] font-semibold leading-[1.4] text-red">
          <AlertIcon size={18} className="mt-[3px] flex-none" />
          <Claim statement={a} />
        </li>
      ))}
    </ul>
  );
}

function Vitals({ vitals, lang, pain }: { vitals: VitalSign[]; lang: LangCode; pain?: number }) {
  const t = copyFor(lang);
  return (
    <Section title={t.vitals}>
      <div className="flex flex-wrap items-center gap-2 rounded-card bg-surface p-3 text-[17px]">
        {vitals.map((v) => (
          <span key={v.kind} className="rounded-xl bg-bg px-3 py-1.5">
            <span className="text-[13px] text-ink-2">{t.vitalKind(v.kind)} </span>
            <span className="font-bold tabular-nums">{vitalValue(v, lang)}</span>
          </span>
        ))}
        {pain !== undefined ? (
          <span className="rounded-xl bg-bg px-3 py-1.5">
            <span className="text-[13px] text-ink-2">{t.painScore} </span>
            <span className="font-bold tabular-nums">{pain}/10</span>
          </span>
        ) : null}
        <SourceButton sources={pain !== undefined ? [...vitalsSource, ...painSource] : vitalsSource} />
      </div>
    </Section>
  );
}

// ---------- Reports ----------

type Props = { profile: PatientProfile; generatedAt: string; vitals: VitalSign[]; lang: LangCode; pain?: number };

export function DoctorReport({ profile, generatedAt, vitals, lang }: Props) {
  const t = copyFor(lang);
  const r = doctorReport;
  return (
    <article>
      <Title generatedAt={generatedAt} lang={lang}>{t.doctorTitle}</Title>
      <PatientStrip profile={profile} at={generatedAt} lang={lang} />
      <Alerts lang={lang} />
      <Section title={t.chiefComplaint}>
        <p className="rounded-card bg-surface px-4 py-3 text-[17px] leading-[1.5]">
          <Claim statement={r.reason} />
        </p>
      </Section>
      <Vitals vitals={vitals} lang={lang} />
      <Section title={t.findings}>
        <List items={r.findings} />
      </Section>
      <Section title={t.interventions}>
        <List items={r.treatment} />
      </Section>
      <Section title={t.currentMedications}>
        <List items={[...r.medications, r.history]} />
      </Section>
      <Section title={t.openQuestions}>
        <List items={r.openQuestions} />
      </Section>
    </article>
  );
}

export function NurseReport({ profile, generatedAt, vitals, lang, pain }: Props) {
  const t = copyFor(lang);
  const r = nurseReport;
  return (
    <article>
      <Title generatedAt={generatedAt} lang={lang}>{t.nurseTitle}</Title>
      <p className="mt-4 rounded-card bg-blue-soft px-4 py-3 text-[18px] font-semibold leading-[1.45]">
        <Claim statement={r.headline} />
      </p>
      <PatientStrip profile={profile} at={generatedAt} lang={lang} />
      <Alerts lang={lang} />
      <Vitals vitals={vitals} lang={lang} pain={pain} />
      <Section title={t.pendingTasks}>
        <ul className="rounded-card bg-surface px-4">
          {r.toDo.map((st, i) => (
            <li key={i} className="flex gap-3 border-t border-line py-3 text-[17px] leading-[1.5] first:border-t-0">
              <span className="mt-1 size-5 flex-none rounded-md border-2 border-ink-3" aria-hidden="true" />
              <Claim statement={st} />
            </li>
          ))}
        </ul>
      </Section>
      <Section title={t.completedInterventions}>
        <List items={r.done} />
      </Section>
    </article>
  );
}

export function EmsReport({ profile, generatedAt, vitals, lang, pain }: Props) {
  const t = copyFor(lang);
  const r = emsReport;
  const block = (letter: string, title: string, items: ReactNode) => (
    <div className="flex gap-3 border-t border-line py-3 first:border-t-0">
      <span className="grid size-9 flex-none place-items-center rounded-xl bg-blue-soft text-[17px] font-bold text-blue" aria-hidden="true">
        {letter}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-[16px] font-bold">{title}</h3>
        {items}
      </div>
    </div>
  );
  const lines = (items: Statement[]) => (
    <ul className="mt-0.5 flex flex-col gap-1">
      {items.map((st, i) => (
        <li key={i} className="text-[17px] leading-[1.5]">
          <Claim statement={st} />
        </li>
      ))}
    </ul>
  );
  return (
    <article>
      <Title generatedAt={generatedAt} lang={lang}>{t.emsTitle}</Title>
      <PatientStrip profile={profile} at={generatedAt} lang={lang} />
      <Alerts lang={lang} />
      <Section title={t.mist.title}>
        <div className="rounded-card bg-surface px-4">
          {block("M", t.mist.m, lines(r.mechanism))}
          {block("I", t.mist.i, lines(r.injuries))}
          {block(
            "S",
            t.mist.s,
            <p className="mt-0.5 text-[17px] leading-[1.5] tabular-nums">
              {vitals.map((v) => `${t.vitalKind(v.kind)} ${vitalValue(v, lang)}`).join(" · ")}
              {pain !== undefined ? ` · ${t.painScore} ${pain}/10` : ""}
              <SourceButton sources={pain !== undefined ? [...vitalsSource, ...painSource] : vitalsSource} />
            </p>,
          )}
          {block("T", t.mist.t, lines(r.treatment))}
        </div>
      </Section>
    </article>
  );
}

export function PatientReport({ generatedAt, careRoute }: { generatedAt: string; careRoute?: ReactNode }) {
  const r = patientReport;
  return (
    <article>
      <Title generatedAt={generatedAt} lang="en">Your visit summary</Title>
      {careRoute}
      <Section title="What happened">
        <p className="rounded-card bg-surface px-4 py-3 text-[17px] leading-[1.5]">
          <Claim statement={r.whatHappened} />
        </p>
      </Section>
      <Section title="Watch for this">
        <p className="rounded-card border-2 border-blue bg-surface px-4 py-3 text-[17px] font-semibold leading-[1.5]">
          <Claim statement={r.watchFor} />
        </p>
      </Section>
      <Section title="What was done">
        <List items={r.done} />
      </Section>
      <Section title="What's next">
        <p className="rounded-card bg-surface px-4 py-3 text-[17px] leading-[1.5]">
          <Claim statement={r.next} />
        </p>
      </Section>
    </article>
  );
}
