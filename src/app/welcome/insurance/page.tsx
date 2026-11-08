"use client";

// Fill the profile from insurance. DEMO ONLY: there is no real insurance
// connection or card reading yet. Either option shows a short "reading" step,
// then opens the profile pages pre-filled with the sample profile so the user
// can check and fix every field before saving.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Screen, StepDots } from "@/components/Screen";
import { CameraIcon, ChevronLeftIcon, ChevronRightIcon, LinkIcon } from "@/components/icons";

type Phase = { kind: "choose" } | { kind: "reading"; source: "card" | "account"; preview?: string };

const READING_MS = 2200;

function OptionButton({
  Icon,
  title,
  detail,
  onClick,
  children,
}: {
  Icon: ComponentType<{ size?: number }>;
  title: string;
  detail: string;
  onClick?: () => void;
  children?: ReactNode;
}) {
  const body = (
    <>
      <span className="grid size-12 flex-none place-items-center rounded-full bg-blue-soft text-blue">
        <Icon size={24} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[18px] font-bold">{title}</span>
        <span className="mt-0.5 block text-[15px] leading-[1.4] text-ink-2">{detail}</span>
      </span>
      <ChevronRightIcon className="flex-none text-ink-3" />
    </>
  );
  const cls = "flex min-h-[104px] w-full cursor-pointer items-center gap-4 rounded-card border border-line bg-surface p-4 active:bg-blue-soft";
  return children ? (
    <label className={cls}>
      {body}
      {children}
    </label>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

export default function InsurancePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "choose" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewUrl = useRef<string | undefined>(undefined);

  // Clean up only when leaving the page.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    };
  }, []);

  function start(source: "card" | "account", preview?: string) {
    previewUrl.current = preview;
    setPhase({ kind: "reading", source, preview });
    timer.current = setTimeout(() => router.push("/welcome/profile?from=insurance"), READING_MS);
  }

  if (phase.kind === "reading") {
    return (
      <Screen className="items-center justify-center text-center">
        {phase.preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview of the photo the user just picked
          <img src={phase.preview} alt="Your insurance card" className="mb-8 max-h-48 w-auto max-w-full rounded-xl border border-line object-contain" />
        ) : null}
        <span className="size-12 animate-spin rounded-full border-4 border-blue-soft border-t-blue" aria-hidden="true" />
        <p className="mt-6 text-[22px] font-bold" role="status">
          {phase.source === "card" ? "Reading your card…" : "Connecting to your insurance…"}
        </p>
        <p className="mt-2 max-w-[300px] text-[17px] leading-[1.45] text-ink-2">
          Next, you&apos;ll check what we found and fix anything that&apos;s wrong.
        </p>
      </Screen>
    );
  }

  return (
    <Screen>
      <header className="flex h-11 items-center justify-between">
        <Link href="/welcome/setup" className="-ml-2 flex h-11 items-center gap-1 px-2 text-[17px] text-blue">
          <ChevronLeftIcon />
          Back
        </Link>
        <StepDots step={3} total={3} />
      </header>

      <h1 className="mt-6 text-[30px] font-bold leading-[1.12] tracking-[-0.01em]">Use your insurance</h1>
      <p className="mt-2 text-[17px] leading-[1.45] text-ink-2">
        We&apos;ll fill in your medical profile from your insurance, then you check it before saving.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <OptionButton Icon={CameraIcon} title="Upload insurance card" detail="Take a photo of your card or choose one.">
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) start("card", URL.createObjectURL(file));
            }}
          />
        </OptionButton>
        <OptionButton
          Icon={LinkIcon}
          title="Connect insurance account"
          detail="Sign in to your insurer to share your records."
          onClick={() => start("account")}
        />
      </div>

      <p className="mt-auto pt-8 text-[15px] leading-[1.45] text-ink-2">
        Demo: this fills in a sample profile. Real insurance connections aren&apos;t built yet.
      </p>
    </Screen>
  );
}
