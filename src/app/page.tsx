"use client";

// Home: one big "Tap to talk" button, the medical profile, and emergency services.
// Matches the original mockup (mockups/app-screens.html, screen 1).
// Tap to talk opens the live translator (/talk); the emergency link opens
// the number directory (/emergency); the profile opens /share.
import Link from "next/link";
import { useEffect, useState } from "react";
import { Screen } from "@/components/Screen";
import { ChevronRightIcon, MicIcon } from "@/components/icons";
import { demoLocation, type PatientProfile } from "@/data";
import { findCountry } from "@/data/emergency-numbers";
import { allergenEn, bloodTypeEn } from "@/lib/labels-en";
import { hasAcceptedDisclaimer } from "@/lib/onboarding";
import { loadProfile } from "@/lib/profile-store";
import { loadCountry } from "@/lib/session-store";

function profileLine(p: PatientProfile) {
  const parts: string[] = [];
  if (p.bloodType !== "unknown") parts.push(bloodTypeEn(p.bloodType));
  const a = p.allergies[0];
  if (a) parts.push(`${allergenEn[a.allergen] ?? "Drug"} allergy`);
  return parts.join(" · ");
}

export default function Home() {
  // undefined = not read yet (avoids a flash of the wrong button on load)
  const [profile, setProfile] = useState<PatientProfile | null | undefined>(undefined);
  const [accepted, setAccepted] = useState(true);
  const [countryCode, setCountryCode] = useState<string>(demoLocation.country);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setProfile(loadProfile());
      setAccepted(hasAcceptedDisclaimer());
      setCountryCode(loadCountry() ?? demoLocation.country);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const number = findCountry(countryCode)?.medical ?? demoLocation.emergencyNumber;
  const line = profile ? profileLine(profile) : "";

  return (
    <Screen className="px-5">
      <header className="flex h-11 items-center px-1">
        <span className="text-[20px] font-bold">Vital</span>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center text-center">
        <Link
          href={accepted ? "/talk" : "/welcome"}
          aria-label="Start translating"
          className="relative grid size-[216px] place-items-center rounded-full"
        >
          <span className="absolute inset-0 rounded-full bg-blue/[0.08]" />
          <span className="absolute inset-[18px] rounded-full bg-blue/[0.14]" />
          <span className="absolute inset-[36px] rounded-full bg-blue/[0.22]" />
          <span className="relative grid size-[132px] place-items-center rounded-full bg-blue text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] transition-transform active:scale-95">
            <MicIcon size={64} />
          </span>
        </Link>
        <h1 className="mt-6 text-[30px] font-bold">Tap to talk</h1>
        <p className="mt-2.5 max-w-[300px] text-[17px] leading-[1.4] text-ink-2">
          Vital listens, translates for the doctor, and shares your medical profile.
        </p>
      </section>

      <div className="flex flex-col gap-3">
        {profile === undefined ? (
          <div className="h-[72px]" />
        ) : (
          <Link
            href={profile ? "/share" : "/welcome"}
            className="flex min-h-[72px] items-center justify-between gap-3 rounded-[14px] border border-line bg-surface px-[18px] py-3.5 active:bg-blue-soft"
          >
            <span className="min-w-0">
              <span className="block text-[17px] font-semibold">{profile ? "My medical profile" : "Set up my medical profile"}</span>
              {line ? (
                <span className="mt-0.5 block text-[15px] font-semibold text-red">{line}</span>
              ) : (
                <span className="mt-0.5 block text-[15px] text-ink-2">Allergies, medications, blood type</span>
              )}
            </span>
            <ChevronRightIcon className="flex-none text-ink-3" />
          </Link>
        )}
        <p className="pb-1 text-center text-[14px] leading-[1.4] text-ink-3">
          Not a replacement for emergency services.{" "}
          <Link href="/emergency" className="whitespace-nowrap font-semibold text-red underline underline-offset-2">
            Call {number}
          </Link>
        </p>
      </div>
    </Screen>
  );
}
