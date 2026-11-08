import Link from "next/link";
import { Screen, StepDots } from "@/components/Screen";
import { DocIcon, MicIcon, ProfileIcon } from "@/components/icons";

const points = [
  { Icon: MicIcon, text: "Speak English. The doctor hears Spanish, and you hear their reply." },
  { Icon: ProfileIcon, text: "It brings your allergies and medications into the conversation." },
  { Icon: DocIcon, text: "The doctor gets a clear written summary at the end." },
];

export default function WelcomePage() {
  return (
    <Screen>
      <header className="flex h-11 items-center justify-between">
        <span className="text-[20px] font-bold">Vital</span>
        <StepDots step={1} total={3} />
      </header>

      <section className="flex flex-1 flex-col justify-center py-8">
        {/* Same voice motif as the home screen, smaller */}
        <div className="relative grid size-[120px] place-items-center" aria-hidden="true">
          <span className="absolute inset-0 rounded-full bg-blue/10" />
          <span className="absolute inset-[14px] rounded-full bg-blue/20" />
          <span className="relative grid size-[76px] place-items-center rounded-full bg-blue text-white shadow-[0_8px_20px_rgba(0,0,0,0.16)]">
            <MicIcon size={36} />
          </span>
        </div>

        <h1 className="mt-8 text-[34px] font-bold leading-[1.1] tracking-[-0.01em]">
          Talk to a doctor in their language.
        </h1>
        <p className="mt-3 text-[17px] leading-[1.45] text-ink-2">
          Vital is a voice interpreter for medical emergencies abroad.
        </p>

        <ul className="mt-8 flex flex-col gap-4">
          {points.map(({ Icon, text }) => (
            <li key={text} className="flex items-start gap-4">
              <span className="grid size-11 flex-none place-items-center rounded-full bg-blue-soft text-blue">
                <Icon size={22} />
              </span>
              <span className="pt-[10px] text-[17px] leading-[1.4]">{text}</span>
            </li>
          ))}
        </ul>
      </section>

      <Link
        href="/welcome/disclaimer"
        className="flex h-14 w-full items-center justify-center rounded-[14px] bg-blue text-[18px] font-semibold text-white active:bg-[#1849B0]"
      >
        Get started
      </Link>
    </Screen>
  );
}
