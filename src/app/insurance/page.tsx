"use client";

// Simulated insurance import. No insurer is connected: any readable image or
// PDF "returns" a fictional record, and every imported section is marked
// Unverified until the patient confirms it or enters it by hand.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { demoProfile, type PatientProfile } from "@/data";
import { Screen } from "@/components/Screen";
import { AlertIcon, ChevronLeftIcon, DocIcon } from "@/components/icons";
import { PrimaryButton, SecondaryButton } from "@/components/form";
import { saveProfile } from "@/lib/profile-store";
import { saveApprovals, saveMeta } from "@/lib/session-store";
import type { ProfileMeta } from "@/lib/sharing";

// The fictional insurer's record is older than the patient's own account: it
// has no allergies on file, which the conversation will flag as a conflict.
const insurerRecord: PatientProfile = {
  ...demoProfile,
  id: "insurance-import-demo",
  allergies: [],
  additionalNotes: undefined,
};

type Status = "idle" | "reading" | "failed";

export default function InsurancePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  async function submit() {
    if (!file) return;
    setStatus("reading");
    await new Promise((r) => setTimeout(r, 1500));
    const readable = (file.type.startsWith("image/") || file.type === "application/pdf") && file.size > 1024;
    if (!readable) {
      setStatus("failed");
      return;
    }
    const meta: ProfileMeta = {
      source: "insurance",
      unverified: ["identity", "bloodType", "allergies", "medications", "conditions", "history", "insurance"],
      insurance: { provider: "Fictional Health Co. (simulated)", memberId: "FHC-000-123-456", groupNumber: "TRAVEL-01", phone: "+18005550100" },
    };
    saveProfile(insurerRecord);
    saveMeta(meta);
    saveApprovals({});
    router.push("/share"); // back to the profile to review it; no audio is recorded during setup
  }

  return (
    <Screen>
      <header className="flex h-11 items-center">
        <Link href="/" className="-ml-2 flex h-11 items-center gap-1 px-2 text-[17px] text-blue">
          <ChevronLeftIcon />
          Home
        </Link>
      </header>
      <h1 className="mt-2 text-[30px] font-bold leading-tight">Upload insurance</h1>
      <p className="mt-2 text-[17px] leading-snug text-ink-2">
        Vital asks your insurer for your medical record. This is a simulation for the demo: use a fictional card only, never a real one.
      </p>

      <label className="mt-6 flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed border-line bg-surface p-8 text-center">
        <DocIcon size={32} className="text-blue" />
        <span className="text-[17px] font-semibold">{file ? file.name : "Choose a photo or PDF"}</span>
        <span className="text-[14px] text-ink-3">Front of a fictional insurance card</span>
        <input
          type="file"
          accept="image/*,application/pdf"
          className="sr-only"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setStatus("idle");
          }}
        />
      </label>

      {status === "failed" && (
        <div role="alert" className="mt-4 flex gap-2 rounded-card bg-red-soft p-4 text-[15px] leading-snug text-red">
          <AlertIcon size={20} className="mt-0.5 shrink-0" />
          <p>
            We could not verify this document. Resubmit a clearer photo or PDF, or <Link href="/welcome/profile" className="font-semibold underline">enter your information manually</Link>.
          </p>
        </div>
      )}

      <div className="mt-auto space-y-3 pt-8">
        <PrimaryButton onClick={submit} disabled={!file || status === "reading"}>
          {status === "reading" ? "Requesting records…" : "Import my records"}
        </PrimaryButton>
        <Link href="/welcome/profile" className="block">
          <SecondaryButton>Enter manually instead</SecondaryButton>
        </Link>
        <p className="text-center text-[13px] text-ink-3">Imported information is marked Unverified until you confirm it.</p>
      </div>
    </Screen>
  );
}
