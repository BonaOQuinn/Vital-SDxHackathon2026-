"use client";

// Home: two ways in.
// 1. Call emergency services now (directory of numbers, then the translator on speaker).
// 2. Guided help: profile -> tell Vital what happened -> where to go -> translated visit.
import Link from "next/link";
import { useEffect, useState } from "react";
import { demoLocation, type PatientProfile } from "@/data";
import { findCountry, flag } from "@/data/emergency-numbers";
import { allergenEn, bloodTypeEn } from "@/lib/labels-en";
import { hasAcceptedDisclaimer } from "@/lib/onboarding";
import { loadProfile } from "@/lib/profile-store";
import { loadCountry } from "@/lib/session-store";

export default function Home() {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [accepted, setAccepted] = useState(true);
  const [countryCode, setCountryCode] = useState<string>(demoLocation.country);

  useEffect(() => {
    setProfile(loadProfile());
    setAccepted(hasAcceptedDisclaimer());
    setCountryCode(loadCountry() ?? demoLocation.country);
  }, []);

  const country = findCountry(countryCode);
  // Guided flow starts with the profile when there is none yet.
  const guidedHref = !accepted ? "/welcome" : profile ? "/intake" : "/welcome/setup";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-[#0e0f11] px-5 pt-[max(env(safe-area-inset-top),20px)] pb-[max(env(safe-area-inset-bottom),20px)] text-white">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e5332a]">
            <PulseIcon />
          </span>
          <span className="text-[24px] font-bold tracking-[-0.02em]">Vital</span>
        </div>
        <Link href="/share" className="flex h-10 items-center gap-2 rounded-full bg-white/[0.07] pr-4 pl-1.5 text-[14px] font-medium active:bg-white/[0.12]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8ab4f8] text-[13px] font-bold text-[#0e0f11]">
            {profile?.fullName?.[0] ?? "?"}
          </span>
          {profile ? "My profile" : "No profile"}
        </Link>
      </header>

      <h1 className="mt-10 text-[34px] font-bold leading-[1.08] tracking-[-0.02em]">Need medical help abroad?</h1>
      <p className="mt-2 text-[17px] text-white/60">Vital speaks for you, in English and Spanish.</p>

      <Link href="/emergency" className="mt-8 flex items-center gap-4 rounded-[26px] bg-[#e5332a] p-5 shadow-[0_18px_40px_rgba(229,51,42,0.35)] active:opacity-90">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20">
          <PhoneIcon />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[22px] font-bold leading-tight">Call emergency services</span>
          <span className="mt-0.5 block text-[15px] text-white/85">
            {country ? `${flag(country.code)} ${country.name}: ${country.medical}` : "Find the number for any country"}
          </span>
        </span>
        <Chevron />
      </Link>

      <Link href={guidedHref} className="mt-4 block rounded-[26px] bg-[#1b1c1f] p-5 active:bg-[#222327]">
        <span className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#8ab4f8]/15 text-[#8ab4f8]">
            <HeartIcon />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[22px] font-bold leading-tight">Get help with Vital</span>
            <span className="mt-0.5 block text-[15px] text-white/60">We guide you from injury to the doctor</span>
          </span>
          <Chevron />
        </span>
        <span className="mt-5 grid grid-cols-3 gap-2 text-[13px]">
          {[
            ["1", "Your profile", profile ? "Ready" : "About 2 min"],
            ["2", "What happened", "Tell Vital"],
            ["3", "At the doctor", "Live translation"],
          ].map(([n, title, sub]) => {
            const done = n === "1" && Boolean(profile);
            return (
              <span key={n} className="block rounded-2xl bg-white/[0.05] p-3">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${done ? "bg-[#3ddc84] text-[#0e0f11]" : "bg-white/10"}`}>
                  {done ? "✓" : n}
                </span>
                <span className="mt-2 block font-semibold leading-tight">{title}</span>
                <span className="block text-white/50">{sub}</span>
              </span>
            );
          })}
        </span>
      </Link>

      {profile && (
        <div className="mt-4 flex flex-wrap gap-2 text-[13px] font-semibold">
          <span className="rounded-full bg-white/[0.07] px-3 py-1.5">Blood {bloodTypeEn(profile.bloodType)}</span>
          {profile.allergies.map((a) => (
            <span key={a.allergen} className="rounded-full bg-[#e5332a]/20 px-3 py-1.5 text-[#ff8a80]">
              {allergenEn[a.allergen]} allergy
            </span>
          ))}
          {profile.medications.slice(0, 2).map((m) => (
            <span key={m.name} className="rounded-full bg-white/[0.07] px-3 py-1.5">
              {m.name}
            </span>
          ))}
        </div>
      )}

      <nav className="mt-6 grid grid-cols-2 gap-3 text-[15px] font-semibold">
        <Link href="/conversation" className="rounded-2xl bg-white/[0.05] p-4 active:bg-white/[0.09]">
          <span className="block text-[#8ab4f8]">Translate now</span>
          <span className="block text-[13px] font-normal text-white/50">Already with a doctor</span>
        </Link>
        <Link href="/report" className="rounded-2xl bg-white/[0.05] p-4 active:bg-white/[0.09]">
          <span className="block text-[#8ab4f8]">Last report</span>
          <span className="block text-[13px] font-normal text-white/50">Patient Emergency Report</span>
        </Link>
      </nav>

      <p className="mt-auto pt-8 text-center text-[12px] leading-snug text-white/40">
        Vital translates and organizes information. It does not diagnose and does not replace emergency services or a professional interpreter. Demo data only.
      </p>
    </main>
  );
}

function PulseIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
      <path d="M12 9v5M9.5 11.5h5" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60" aria-hidden="true">
      <path d="m7.5 4 6 6-6 6" />
    </svg>
  );
}
