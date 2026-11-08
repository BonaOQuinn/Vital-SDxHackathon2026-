import type { ReactNode } from "react";

/** Phone-width page frame with safe-area padding for iPhone. */
export function Screen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <main
      className={`mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-6 pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),20px)] ${className}`}
    >
      {children}
    </main>
  );
}

/** Onboarding progress: the current step is a wider blue bar. */
export function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5" role="img" aria-label={`Step ${step} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full ${i + 1 === step ? "w-6 bg-blue" : i + 1 < step ? "w-1.5 bg-blue" : "w-1.5 bg-line"}`}
        />
      ))}
    </div>
  );
}
