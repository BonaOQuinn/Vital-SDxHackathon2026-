"use client";

// Home: the demo path from profile to translation to report.
// Mia can restyle this; the links are the flow.
import Link from "next/link";
import { useEffect, useState } from "react";
import { Screen } from "@/components/Screen";
import { DocIcon, MicIcon, ProfileIcon } from "@/components/icons";
import { hasAcceptedDisclaimer } from "@/lib/onboarding";
import { loadProfile } from "@/lib/profile-store";

const rows = [
  { href: "/welcome", icon: ProfileIcon, title: "Create profile manually", sub: "Allergies, medications, history, contacts" },
  { href: "/insurance", icon: DocIcon, title: "Upload insurance (simulated)", sub: "Imported data is marked Unverified" },
  { href: "/share", icon: ProfileIcon, title: "Review what you share", sub: "Approve each section for the clinician" },
  { href: "/conversation", icon: MicIcon, title: "Start translation", sub: "English ↔ Español, hands-free" },
  { href: "/report", icon: DocIcon, title: "Patient Emergency Report", sub: "From the last conversation" },
];

export default function Home() {
  const [name, setName] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(true);
  useEffect(() => {
    setName(loadProfile()?.fullName ?? null);
    setAccepted(hasAcceptedDisclaimer());
  }, []);

  return (
    <Screen>
      <h1 className="mt-6 text-[40px] font-bold leading-tight">Vital</h1>
      <p className="mt-1 text-[17px] text-ink-2">{name ? `Profile: ${name}` : "No profile yet"}</p>

      {!accepted && (
        <Link href="/welcome/disclaimer" className="mt-4 rounded-card bg-red-soft p-3 text-[15px] text-red">
          Read the emergency disclaimer before using Vital.
        </Link>
      )}

      <nav className="mt-6 space-y-2">
        {rows.map(({ href, icon: Icon, title, sub }) => (
          <Link key={href} href={href} className="flex items-center gap-3 rounded-card bg-surface p-4 active:bg-blue-soft">
            <Icon className="text-blue" />
            <span>
              <span className="block text-[17px] font-semibold">{title}</span>
              <span className="block text-[14px] text-ink-2">{sub}</span>
            </span>
          </Link>
        ))}
      </nav>

      <p className="mt-auto pt-8 text-center text-[13px] leading-snug text-ink-3">
        Vital translates and organizes information. It does not diagnose and does not replace emergency services or a professional interpreter. Demo data only.
      </p>
    </Screen>
  );
}
