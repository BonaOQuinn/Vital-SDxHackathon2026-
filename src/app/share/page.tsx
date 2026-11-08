"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { demoProfile, type PatientProfile } from "@/data";
import { Screen } from "@/components/Screen";
import { AlertIcon, ChevronLeftIcon, MicIcon } from "@/components/icons";
import { PrimaryButton, SecondaryButton } from "@/components/form";
import { allergenEn, bloodTypeEn, frequencyEn, relationshipEn, severityEn } from "@/lib/labels-en";
import { loadProfile, saveProfile } from "@/lib/profile-store";
import { loadApprovals, loadMeta, saveApprovals, saveMeta } from "@/lib/session-store";
import { missingSections, sections, type Approvals, type ProfileMeta, type SectionId } from "@/lib/sharing";
import { formatCm, formatFtIn, formatKg, formatLb } from "@/lib/units";

function summary(id: SectionId, p: PatientProfile, meta: ProfileMeta): string[] {
  switch (id) {
    case "identity":
      return [p.fullName || "No name", p.dateOfBirth ? `Born ${p.dateOfBirth}` : "No date of birth"];
    case "bloodType":
      return [bloodTypeEn(p.bloodType)];
    case "body": {
      const w = p.weight?.entered.unit === "lb" ? `${formatKg(p.weight.kg)} (${formatLb(p.weight.entered.value)})` : p.weight ? formatKg(p.weight.kg) : "No weight";
      const e = p.height?.entered;
      const h = e?.unit === "ft_in" ? `${formatCm(p.height.cm)} (${formatFtIn(e.ft, e.in)})` : p.height ? formatCm(p.height.cm) : "No height";
      return [w, h];
    }
    case "allergies":
      return p.allergies.length ? p.allergies.map((a) => `${allergenEn[a.allergen]} (${severityEn[a.severity].toLowerCase()})`) : ["No known allergies"];
    case "medications":
      return p.medications.length ? p.medications.map((m) => `${m.name} ${m.dose.amount} ${m.dose.unit}, ${frequencyEn[m.frequency].toLowerCase()}`) : ["No medications"];
    case "conditions":
      return p.conditions.length ? p.conditions.map((c) => c.name.en) : ["No conditions"];
    case "history":
      return [...p.pastProcedures.map((x) => `${x.name.en} (${x.year})`), ...p.immunizations.map((x) => `${x.name.en}, last ${x.lastDose}`)].slice(0, 4).concat(p.pastProcedures.length + p.immunizations.length ? [] : ["Nothing recorded"]);
    case "contacts":
      return p.emergencyContacts.length ? p.emergencyContacts.map((c) => `${c.name}, ${relationshipEn[c.relationship].toLowerCase()}`) : ["No emergency contacts"];
    case "insurance":
      return meta.insurance ? [`${meta.insurance.provider}`, `Member ID ${meta.insurance.memberId}`] : ["No insurance on file"];
  }
}

export default function SharePage() {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [meta, setMeta] = useState<ProfileMeta>({ source: "manual", unverified: [] });
  const [approvals, setApprovals] = useState<Approvals>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
    setMeta(loadMeta());
    setApprovals(loadApprovals());
    setLoaded(true);
  }, []);

  function toggle(id: SectionId) {
    const next = { ...approvals, [id]: !approvals[id] };
    setApprovals(next);
    saveApprovals(next);
  }

  function confirmSection(id: SectionId) {
    const next = { ...meta, unverified: meta.unverified.filter((s) => s !== id) };
    setMeta(next);
    saveMeta(next);
  }

  function useDemo() {
    saveProfile(demoProfile);
    const m: ProfileMeta = { source: "demo", unverified: [], insurance: { provider: "Fictional Health Co. (demo)", memberId: "FHC-000-123-456", groupNumber: "TRAVEL-01" } };
    saveMeta(m);
    setProfile(demoProfile);
    setMeta(m);
  }

  if (!loaded) return null;

  if (!profile) {
    return (
      <Screen>
        <h1 className="mt-10 text-[30px] font-bold">No profile yet</h1>
        <p className="mt-2 text-[17px] text-ink-2">Create your emergency profile before sharing it with the clinician.</p>
        <div className="mt-8 space-y-3">
          <Link href="/welcome/profile" className="block"><PrimaryButton>Enter it manually</PrimaryButton></Link>
          <Link href="/insurance" className="block"><SecondaryButton>Upload insurance card</SecondaryButton></Link>
          <SecondaryButton onClick={useDemo}>Use the demo profile</SecondaryButton>
        </div>
      </Screen>
    );
  }

  const missing = missingSections(profile, meta);
  const approvedCount = sections.filter((s) => approvals[s.id]).length;
  const allOn = approvedCount === sections.length;

  function setAll(on: boolean) {
    const next: Approvals = Object.fromEntries(sections.map((s) => [s.id, on]));
    setApprovals(next);
    saveApprovals(next);
  }

  return (
    <Screen className="pb-0">
      <header className="flex h-11 items-center">
        <Link href="/" className="-ml-2 flex h-11 items-center gap-1 px-2 text-[17px] text-blue">
          <ChevronLeftIcon />
          Home
        </Link>
      </header>
      <h1 className="mt-2 text-[30px] font-bold leading-tight tracking-[-0.01em]">What you share</h1>
      <p className="mt-2 text-[16px] leading-snug text-ink-2">
        Turn on each section the clinician may see. Shared sections are shown in Spanish and checked against what you say.
      </p>

      <div className="mt-5 rounded-card bg-surface p-4">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-semibold">
            {approvedCount} of {sections.length} sections shared
          </p>
          <button onClick={() => setAll(!allOn)} className="rounded-full bg-blue-soft px-3 py-1.5 text-[14px] font-semibold text-blue active:opacity-80">
            {allOn ? "Turn all off" : "Share all"}
          </button>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
          <div className="h-full rounded-full bg-blue transition-[width] duration-300" style={{ width: `${(approvedCount / sections.length) * 100}%` }} />
        </div>
        {meta.unverified.length > 0 && (
          <p className="mt-3 flex gap-2 text-[14px] leading-snug text-red">
            <AlertIcon size={18} className="mt-0.5 shrink-0" />
            {meta.unverified.length} sections came from your insurance upload and are unverified.
          </p>
        )}
      </div>

      <ul className="mt-4 space-y-3">
        {sections.map((s) => {
          const on = approvals[s.id] === true;
          const unverified = meta.unverified.includes(s.id);
          const isMissing = missing.includes(s.id);
          return (
            <li key={s.id} className={`relative rounded-card border-2 bg-surface p-4 transition-colors ${on ? "border-blue" : "border-transparent"}`}>
              <label className="flex cursor-pointer items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 text-[17px] font-semibold">
                    {s.title}
                    {unverified && <span className="rounded-md bg-red-soft px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red">Unverified</span>}
                  </p>
                  <p className="text-[13px] text-ink-3">{s.titleEs}</p>
                  <ul className="mt-1.5 text-[15px] leading-snug text-ink-2">
                    {summary(s.id, profile, meta).map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
                <input type="checkbox" role="switch" checked={on} onChange={() => toggle(s.id)} className="peer sr-only" aria-label={`Share ${s.title}`} />
                <span
                  aria-hidden="true"
                  className="relative mt-0.5 h-[30px] w-[50px] shrink-0 rounded-full bg-line transition-colors peer-checked:bg-blue peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-blue after:absolute after:top-[3px] after:left-[3px] after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
                />
              </label>
              {unverified && (
                <p className="mt-3 text-[14px] leading-snug text-red">
                  Imported from insurance. Resubmit the document, <Link href="/welcome/profile" className="underline">enter it manually</Link>, or{" "}
                  <button onClick={() => confirmSection(s.id)} className="font-semibold underline">confirm it is correct</button>.
                </p>
              )}
              {isMissing && !unverified && (
                <p className="mt-3 flex gap-2 text-[14px] text-red">
                  <AlertIcon size={18} className="mt-0.5 shrink-0" />
                  Missing. The clinician will not have this information.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-0 -mx-6 mt-4 border-t border-line bg-bg/95 px-6 pt-3 pb-[max(env(safe-area-inset-bottom),14px)] backdrop-blur">
        <Link
          href="/conversation"
          className="flex h-14 w-full items-center justify-center gap-2 rounded-[14px] bg-blue text-[18px] font-semibold text-white active:bg-[#1849B0]"
        >
          <MicIcon size={22} /> Start translation
        </Link>
        <p className="mt-2 text-center text-[12px] leading-snug text-ink-3">
          Vital translates and organizes. It does not diagnose or replace emergency services or a professional interpreter.
        </p>
      </div>
    </Screen>
  );
}
