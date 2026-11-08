"use client";

import { useEffect, useState, type ReactNode } from "react";
import { labelsEs } from "@/data";

/**
 * Shows the summary until `expiresAt`, then an expired message.
 * The clock is read after mount (Next.js prerenders this page).
 */
export function ExpiryGate({ expiresAt, children }: { expiresAt: string; children: ReactNode }) {
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the clock must happen after mount
    setExpired(Date.now() > Date.parse(expiresAt));
  }, [expiresAt]);

  if (!expired) return <>{children}</>;
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center px-6 text-center">
      <p className="text-[22px] font-bold">This link has expired.</p>
      <p className="mt-2 text-[17px] text-ink-2" lang="es">
        {labelsEs.linkExpired}
      </p>
    </div>
  );
}
