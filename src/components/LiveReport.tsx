"use client";

// The report as it updates during the translated conversation.
import { useEffect, useState } from "react";
import type { InjuryRecord } from "@/data";
import { reportItems, type ReportItem } from "@/lib/report-grounding";

const POLL_MS = 3000;

export function LiveReport({ sessionId }: { sessionId: string }) {
  const [items, setItems] = useState<ReportItem[]>([]);

  useEffect(() => {
    if (!sessionId) return;
    let current = true;
    const poll = () =>
      fetch(`/api/session/${sessionId}`, { cache: "no-store" })
        .then((res) => (res.ok ? (res.json() as Promise<{ injury_record: Partial<InjuryRecord> }>) : null))
        .then((row) => {
          if (current && row) setItems(reportItems(row.injury_record));
        })
        .catch(() => {});
    void poll();
    const timer = window.setInterval(poll, POLL_MS);
    return () => {
      current = false;
      window.clearInterval(timer);
    };
  }, [sessionId]);

  if (items.length === 0) return null;
  return (
    <details className="mx-4 mb-2 rounded-card bg-call-card">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-[15px] font-semibold">
        Live report · Reporte en vivo
        <span className="text-call-muted">{items.length}</span>
      </summary>
      <ul className="max-h-[30dvh] space-y-2 overflow-y-auto px-3 pb-3 text-[14px] leading-snug">
        {items.map((item) => (
          <li key={item.id}>
            {item.text.en}
            <span className="block text-call-muted" lang="es">{item.text.es}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
