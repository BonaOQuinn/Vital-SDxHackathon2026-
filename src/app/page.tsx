"use client";

// Home: the demo path from profile to translation to report.
import Link from "next/link";
import { useEffect, useState } from "react";
import type { PatientProfile } from "@/data";
import { Screen } from "@/components/Screen";
import { AlertIcon, DocIcon, MicIcon, ProfileIcon } from "@/components/icons";
import { allergenEn, bloodTypeEn } from "@/lib/labels-en";
import { hasAcceptedDisclaimer } from "@/lib/onboarding";
import { loadProfile } from "@/lib/profile-store";
import { loadApprovals, loadMeta } from "@/lib/session-store";

const steps = [
  { href: "/welcome", icon: ProfileIcon, title: "Create your profile", sub: "Allergies, medicines, contacts" },
  { href: "/insurance", icon: DocIcon, title: "Or import from insurance", sub: "Simulated, marked Unverified" },
  { href: "/share", icon: ProfileIcon, title: "Choose what to share", sub: "Approve section by section" },
  { href: "/report", icon: DocIcon, title: "Patient Emergency Report", sub: "From your last conversation" },
];

export default function Home() {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [shared, setShared] = useState(0);
  const [unverified, setUnverified] = useState(0);
  const [accepted, setAccepted] = useState(true);

  useEffect(() => {
    setProfile(loadProfile());
    setShared(Object.values(loadApprovals()).filter(Boolean).length);
    setUnverified(loadMeta().unverified.length);
    setAccepted(hasAcceptedDisclaimer());
  }, []);

  return (
    <Screen>
      <header className="mt-4 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red text-white shadow-[0_8px_20px_rgba(200,37,27,0.3)]">
          <PulseIcon />
        </span>
        <div>
          <h1 className="text-[32px] font-bold leading-none tracking-[-0.02em]">Vital</h1>
          <p className="mt-1 text-[15px] text-ink-2">Your voice in a medical emergency abroad</p>
        </div>
      </header>

      {!accepted && (
        <Link href="/welcome/disclaimer" className="mt-5 flex items-center gap-2 rounded-card bg-red-soft p-3 text-[15px] font-medium text-red">
          <AlertIcon size={18} className="shrink-0" />
          Read the emergency disclaimer before using Vital.
        </Link>
      )}

      <section className="mt-6 overflow-hidden rounded-[22px] bg-call p-5 text-call-ink shadow-[0_16px_40px_rgba(15,27,51,0.25)]">
        {profile ? (
          <>
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-call-muted">Emergency profile</p>
            <p className="mt-1 text-[24px] font-bold leading-tight">{profile.fullName}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[13px] font-semibold">
              <span className="rounded-full bg-call-card-2 px-3 py-1">Blood {bloodTypeEn(profile.bloodType)}</span>
              {profile.allergies.map((a) => (
                <span key={a.allergen} className="rounded-full bg-red px-3 py-1 text-white">
                  {allergenEn[a.allergen]} allergy
                </span>
              ))}
              {profile.allergies.length === 0 && <span className="rounded-full bg-call-card-2 px-3 py-1">No allergies on file</span>}
              <span className="rounded-full bg-call-card-2 px-3 py-1">{shared} of 9 shared</span>
              {unverified > 0 && <span className="rounded-full bg-red-soft px-3 py-1 text-red">{unverified} unverified</span>}
            </div>
          </>
        ) : (
          <>
            <p className="text-[22px] font-bold leading-tight">Talk to local doctors in your language.</p>
            <p className="mt-2 text-[15px] leading-snug text-call-muted">Vital translates English ⇄ Español out loud and brings your medical profile into the conversation.</p>
          </>
        )}
        <Link
          href={profile ? "/conversation" : "/welcome"}
          className="mt-5 flex h-14 items-center justify-center gap-2 rounded-2xl bg-blue text-[18px] font-semibold text-white active:bg-[#1849B0]"
        >
          {profile ? (
            <>
              <MicIcon size={22} /> Start translation
            </>
          ) : (
            "Set up my profile"
          )}
        </Link>
      </section>

      <nav className="mt-6 overflow-hidden rounded-[22px] bg-surface">
        {steps.map(({ href, icon: Icon, title, sub }, i) => (
          <Link key={href} href={href} className={`flex items-center gap-3.5 px-4 py-3.5 active:bg-blue-soft ${i ? "border-t border-line" : ""}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-soft text-blue">
              <Icon size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-semibold">{title}</span>
              <span className="block truncate text-[14px] text-ink-2">{sub}</span>
            </span>
            <span className="text-[20px] text-ink-3" aria-hidden="true">›</span>
          </Link>
        ))}
      </nav>

      <p className="mt-auto pt-8 text-center text-[12px] leading-snug text-ink-3">
        Vital translates and organizes information. It does not diagnose and does not replace emergency services or a professional interpreter. Demo data only.
      </p>
    </Screen>
  );
}

function PulseIcon() {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
    </svg>
  );
}
