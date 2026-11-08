"use client";

import { useState } from "react";
import type { Lang } from "@/data";

const copyText = {
  es: { copy: "Copiar enlace", copied: "Enlace copiado", share: "Compartir", title: "Resumen clínico · Vital" },
  en: { copy: "Copy link", copied: "Link copied", share: "Share", title: "Clinical summary · Vital" },
} as const;

/** Copy the summary link, or open the phone's share sheet when available. */
export function ShareActions({ lang = "en" }: { lang?: Lang }) {
  const t = copyText[lang];
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the address bar still has the link.
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: t.title, url: window.location.href });
      } catch {
        // User closed the share sheet.
      }
    } else {
      copy();
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={copy}
        className="flex h-12 items-center justify-center rounded-[14px] border border-line bg-surface text-[16px] font-semibold text-blue active:bg-blue-soft"
        aria-live="polite"
      >
        {copied ? t.copied : t.copy}
      </button>
      <button
        type="button"
        onClick={share}
        className="flex h-12 items-center justify-center rounded-[14px] bg-blue text-[16px] font-semibold text-white active:bg-[#1849B0]"
      >
        {t.share}
      </button>
    </div>
  );
}

/** Plain "Share" text button for the top bar. */
export function ShareLink() {
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: copyText.en.title, url });
      } catch {
        // User closed the share sheet.
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // Clipboard blocked: the address bar still has the link.
      }
    }
  }
  return (
    <button type="button" onClick={share} className="-mr-2 min-h-11 px-2 text-[17px] text-blue">
      Share
    </button>
  );
}
