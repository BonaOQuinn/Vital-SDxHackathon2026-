"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Bottom sheet for phones. Closes on the backdrop, Escape, or the Done button. */
export function Sheet({ title, open, onClose, children, z = "z-40" }: { title: string; open: boolean; onClose: () => void; children: ReactNode; z?: string }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className={`fixed inset-0 ${z} flex items-end justify-center`}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative flex max-h-[85dvh] w-full max-w-[640px] flex-col rounded-t-[20px] bg-bg pb-[max(env(safe-area-inset-bottom),16px)] outline-none"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-[17px] font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="min-h-11 px-2 text-[17px] font-semibold text-blue">
            Done
          </button>
        </div>
        <div className="overflow-y-auto px-5 pt-4">{children}</div>
      </div>
    </div>
  );
}
