import Link from "next/link";
import type { ComponentType } from "react";
import { Screen, StepDots } from "@/components/Screen";
import { ChevronLeftIcon, ChevronRightIcon, InsuranceCardIcon, PencilIcon } from "@/components/icons";

function Option({
  href,
  Icon,
  title,
  detail,
}: {
  href: string;
  Icon: ComponentType<{ size?: number }>;
  title: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[104px] items-center gap-4 rounded-card border border-line bg-surface p-4 active:bg-blue-soft"
    >
      <span className="grid size-12 flex-none place-items-center rounded-full bg-blue-soft text-blue">
        <Icon size={24} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[18px] font-bold">{title}</span>
        <span className="mt-0.5 block text-[15px] leading-[1.4] text-ink-2">{detail}</span>
      </span>
      <ChevronRightIcon className="flex-none text-ink-3" />
    </Link>
  );
}

// Choose how to fill in the medical profile: by hand, or from insurance.
export default function SetupChoicePage() {
  return (
    <Screen>
      <header className="flex h-11 items-center justify-between">
        <Link href="/welcome/disclaimer" className="-ml-2 flex h-11 items-center gap-1 px-2 text-[17px] text-blue">
          <ChevronLeftIcon />
          Back
        </Link>
        <StepDots step={3} total={3} />
      </header>

      <h1 className="mt-6 text-[30px] font-bold leading-[1.12] tracking-[-0.01em]">Set up your medical profile</h1>
      <p className="mt-2 text-[17px] leading-[1.45] text-ink-2">
        Medical staff will see it in their language if you need care abroad. How would you like to add it?
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <Option href="/welcome/profile" Icon={PencilIcon} title="Enter it myself" detail="Answer a few short questions. About 3 minutes." />
        <Option
          href="/welcome/insurance"
          Icon={InsuranceCardIcon}
          title="Use my insurance"
          detail="Upload your insurance card or connect your insurance account."
        />
      </div>
    </Screen>
  );
}
