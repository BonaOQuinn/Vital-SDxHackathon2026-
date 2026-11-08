"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Screen, StepDots } from "@/components/Screen";
import { AlertIcon, ChevronLeftIcon } from "@/components/icons";
import { acceptDisclaimer } from "@/lib/onboarding";

const limits = [
  "Vital translates and organizes what is said. It does not diagnose.",
  "It does not replace a professional medical interpreter.",
  "Always follow the instructions of the medical staff treating you.",
];

export default function DisclaimerPage() {
  const router = useRouter();
  const [understood, setUnderstood] = useState(false);

  function handleContinue() {
    acceptDisclaimer();
    // Step 3 (profile setup) replaces this destination.
    router.push("/");
  }

  return (
    <Screen>
      <header className="flex h-11 items-center justify-between">
        <Link href="/welcome" className="-ml-2 flex h-11 items-center gap-1 px-2 text-[17px] text-blue">
          <ChevronLeftIcon />
          Back
        </Link>
        <StepDots step={2} total={3} />
      </header>

      <section className="flex flex-1 flex-col pt-6 pb-6">
        <span className="grid size-14 place-items-center rounded-full bg-red-soft text-red">
          <AlertIcon size={28} />
        </span>

        <h1 className="mt-5 text-[30px] font-bold leading-[1.12] tracking-[-0.01em]">
          Vital is not a replacement for emergency services.
        </h1>
        <p className="mt-3 text-[19px] font-semibold leading-[1.4] text-red">
          If someone&apos;s life is in danger, call the local emergency number first.
        </p>

        <ul className="mt-6 rounded-card bg-surface px-4">
          {limits.map((text) => (
            <li key={text} className="border-t border-line py-3.5 text-[17px] leading-[1.4] first:border-t-0">
              {text}
            </li>
          ))}
        </ul>
      </section>

      <label className="mb-3 flex min-h-14 cursor-pointer items-center gap-3 rounded-[14px] border border-line bg-surface px-4 py-3">
        <input
          type="checkbox"
          checked={understood}
          onChange={(e) => setUnderstood(e.target.checked)}
          className="size-6 flex-none accent-blue"
        />
        <span className="text-[17px] font-semibold">I understand</span>
      </label>

      <button
        type="button"
        onClick={handleContinue}
        disabled={!understood}
        className="flex h-14 w-full items-center justify-center rounded-[14px] bg-blue text-[18px] font-semibold text-white active:bg-[#1849B0] disabled:bg-[#A9BCE6]"
      >
        Continue
      </button>
    </Screen>
  );
}
