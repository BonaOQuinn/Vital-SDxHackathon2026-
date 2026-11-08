"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { demoLocation } from "@/data";
import { AlertIcon, ChevronLeftIcon, MicIcon } from "@/components/icons";
import type { Lang, Note, TurnRequest, TurnResponse } from "@/lib/contract";
import { loadProfile } from "@/lib/profile-store";
import type { ReviewedWarning, SessionTurn } from "@/lib/report";
import { loadApprovals, loadMeta, saveSession, type StoredSession } from "@/lib/session-store";
import { buildSharedProfile, type SharedProfile } from "@/lib/sharing";
import { useVoiceLoop } from "@/lib/use-voice-loop";

type Phase = "idle" | "transcribing" | "translating" | "speaking";

const phaseLabel: Record<Phase, { en: string; es: string }> = {
  idle: { en: "Listening", es: "Escuchando" },
  transcribing: { en: "Transcribing", es: "Transcribiendo" },
  translating: { en: "Translating", es: "Traduciendo" },
  speaking: { en: "Speaking", es: "Hablando" },
};

const langName = (l: Lang) => (l === "en" ? "English" : "Español");

export default function ConversationPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<SharedProfile | null>(null);
  const [session, setSession] = useState<StoredSession>({
    sessionId: "",
    startedAt: "",
    turns: [],
    notes: [],
    warnings: [],
  });
  const [phase, setPhase] = useState<Phase>("idle");
  const [pending, setPending] = useState<{ original: string; lang: Lang | null } | null>(null);
  const [currentLang, setCurrentLang] = useState<Lang | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [typedLang, setTypedLang] = useState<Lang>("en");
  const sessionRef = useRef(session);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = loadProfile();
    if (p) setProfile(buildSharedProfile(p, loadMeta(), loadApprovals()));
    setSession((s) => ({ ...s, sessionId: `local-${crypto.randomUUID()}`, startedAt: new Date().toISOString() }));
  }, []);

  useEffect(() => {
    sessionRef.current = session;
    saveSession(session);
  }, [session]);
  useEffect(() => {
    // Braces matter: Chrome's smooth scrollTo returns a Promise, which React would call as cleanup.
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [session.turns.length, pending]);

  const speakText = useCallback(async (text: string, lang: Lang, play: (b: Blob) => Promise<void>) => {
    const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang }) });
    if (res.ok) await play(await res.blob());
  }, []);

  // One utterance through the pipeline: translate, show, speak.
  const handleText = useCallback(
    async (original: string, detected: Lang | null, play: (b: Blob) => Promise<void>) => {
      setPending({ original, lang: detected });
      setCurrentLang(detected);
      setPhase("translating");
      const s = sessionRef.current;
      const body: TurnRequest = {
        sessionId: s.sessionId,
        transcript: original,
        detected_lang: detected ?? undefined,
        profile: profile ?? undefined,
        unverified: profile?.unverified,
        history: s.turns.slice(-6).map((t) => ({ speaker: t.speaker, original: t.original })),
      };
      const res = await fetch("/api/turn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        setPending(null);
        setFailure("Translation failed. Please repeat, or type the message below.");
        return;
      }
      const turn = (await res.json()) as TurnResponse;
      // Same rule as mergeAlerts on the server: one allergy / blood-thinner alert per kind, profile conflicts by id.
      const fresh = turn.alerts.filter((w) => !s.warnings.some((x) => (w.kind === "profile" ? x.id === w.id : x.kind === w.kind)));
      const t: SessionTurn = { speaker: turn.speaker, source_lang: turn.source_lang, original, translation: turn.translation, at: new Date().toISOString() };
      setCurrentLang(turn.source_lang);
      setPending(null);
      setFailure(null);
      setSession((prev) => ({
        ...prev,
        turns: [...prev.turns, t],
        notes: [...prev.notes, ...((turn.notes ?? []) as Note[])],
        warnings: [...prev.warnings, ...fresh],
      }));

      setPhase("speaking");
      const target = turn.target_lang ?? (turn.source_lang === "en" ? "es" : "en");
      await speakText(turn.translation, target, play);
      // New warnings are read aloud in both languages.
      for (const w of fresh) {
        await speakText(w.message.en, "en", play);
        await speakText(w.message.es, "es", play);
      }
    },
    [profile, speakText],
  );

  const voice = useVoiceLoop({
    onUtterance: async (audio) => {
      setPhase("transcribing");
      try {
        const form = new FormData();
        form.append("audio", audio, "utterance");
        const res = await fetch("/api/stt", { method: "POST", body: form });
        if (!res.ok) {
          setFailure("Speech-to-text failed. Please repeat, or type the message below.");
          return;
        }
        const stt = (await res.json()) as { text: string; lang: Lang | null };
        if (stt.text && stt.text.replace(/[^\p{L}\p{N}]/gu, "").length > 1) await handleText(stt.text, stt.lang, voice.play);
      } catch {
        setFailure("Network error. Please repeat, or type the message below.");
      } finally {
        setPhase("idle");
      }
    },
  });

  async function sendTyped(e: React.FormEvent) {
    e.preventDefault();
    const text = typed.trim();
    if (!text || phase !== "idle") return;
    setTyped("");
    try {
      await handleText(text, typedLang, voice.play);
    } finally {
      setPhase("idle");
    }
  }

  function review(id: string, resolution: ReviewedWarning["resolution"]) {
    setSession((prev) => ({ ...prev, warnings: prev.warnings.map((w) => (w.id === id ? { ...w, resolution } : w)) }));
  }

  function end() {
    voice.stop();
    saveSession({ ...sessionRef.current, endedAt: new Date().toISOString() });
    router.push("/report");
  }

  const open = useMemo(() => session.warnings.filter((w) => !w.resolution), [session.warnings]);
  const live = voice.state === "listening" || voice.state === "hearing" || voice.state === "paused";
  const status = voice.state === "hearing" ? { en: "Hearing speech", es: "Escuchando voz" } : phaseLabel[phase];

  return (
    <main className="mx-auto flex h-dvh w-full max-w-[480px] flex-col bg-call text-call-ink">
      <header className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <Link href="/share" className="-ml-2 flex h-11 items-center gap-1 px-2 text-[17px] text-call-muted">
          <ChevronLeftIcon />
          Profile
        </Link>
        <a href={`tel:${demoLocation.emergencyNumber}`} className="rounded-full bg-end px-4 py-2 text-[15px] font-semibold text-white">
          Call {demoLocation.emergencyNumber}
        </a>
      </header>

      <div className="flex items-center gap-3 px-4 pb-3">
        <span className={`h-2.5 w-2.5 rounded-full ${live ? "bg-live animate-pulse" : "bg-call-control"}`} />
        <p className="text-[15px] text-call-muted" aria-live="polite">
          {live ? `${status.en} · ${status.es}` : "Translation is off · Traducción apagada"}
          {currentLang && live ? ` · ${langName(currentLang)} detected` : ""}
        </p>
        {live && (
          <span className="ml-auto h-1.5 w-16 overflow-hidden rounded-full bg-call-control" aria-hidden="true">
            <span className="block h-full bg-live transition-[width] duration-75" style={{ width: `${Math.round(voice.level * 100)}%` }} />
          </span>
        )}
      </div>

      {open.length > 0 && (
        <section className="mx-4 mb-3 max-h-[38dvh] space-y-2 overflow-y-auto" aria-live="assertive">
          {open.map((w) => (
            <div key={w.id} className="rounded-card border border-red bg-red-soft p-2.5 text-red">
              <div className="flex gap-2">
                <AlertIcon size={20} className="mt-0.5 shrink-0" />
                <div className="text-[14px] leading-snug">
                  <p className="font-semibold">{w.message.en}</p>
                  <p className="mt-1">{w.message.es}</p>
                </div>
              </div>
              <div className="mt-2 flex gap-2 text-[13px] font-semibold">
                <button onClick={() => review(w.id, "confirmed")} className="rounded-full bg-red px-3 py-1.5 text-white">Reviewed · Revisado</button>
                <button onClick={() => review(w.id, "corrected")} className="rounded-full border border-red px-3 py-1.5">Profile wrong · Corregir</button>
              </div>
            </div>
          ))}
        </section>
      )}

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        {session.turns.length === 0 && !pending && (
          <div className="mt-6 rounded-card bg-call-card p-4 text-[15px] leading-relaxed text-call-muted">
            <p>Tap <b className="text-call-ink">Start translation</b>, set the phone down between you, and speak normally. Vital waits for each speaker to pause, then translates aloud.</p>
            <p className="mt-2">Toque <b className="text-call-ink">Iniciar</b> y hable con normalidad. Vital espera a que termine cada persona y traduce en voz alta.</p>
            {!profile && <p className="mt-3 text-red-soft">No approved profile yet. <Link href="/share" className="underline">Review and share it first.</Link></p>}
          </div>
        )}
        {session.turns.map((t, i) => (
          <article key={i} className={`rounded-card p-3 ${t.speaker === "patient" ? "bg-call-card" : "bg-call-card-2"}`}>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-call-muted">
              {t.speaker === "patient" ? "Patient · Paciente" : "Clinician · Médico"} · {langName(t.source_lang)}
            </p>
            <p className="mt-1 text-[15px] text-call-muted">{t.original}</p>
            <p className="mt-1.5 text-[18px] font-medium leading-snug">{t.translation}</p>
          </article>
        ))}
        {pending && (
          <article className="rounded-card bg-call-card p-3 opacity-80">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-call-muted">{pending.lang ? langName(pending.lang) : "Detecting"} · translating…</p>
            <p className="mt-1 text-[15px] text-call-muted">{pending.original}</p>
          </article>
        )}
      </div>

      {(voice.error || failure) && (
        <p role="alert" className="mx-4 mb-2 rounded-card bg-red-soft p-3 text-[14px] text-red">
          {voice.error ?? failure}
        </p>
      )}

      <form onSubmit={sendTyped} className="flex gap-2 px-4 pb-2">
        <select value={typedLang} onChange={(e) => setTypedLang(e.target.value as Lang)} aria-label="Typed message language" className="rounded-xl bg-call-control px-2 text-[15px]">
          <option value="en">EN</option>
          <option value="es">ES</option>
        </select>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Type instead · Escribir"
          className="min-w-0 flex-1 rounded-xl bg-call-control px-3 py-2.5 text-[16px] text-call-ink placeholder:text-call-muted"
        />
        <button type="submit" disabled={!typed.trim() || phase !== "idle"} className="rounded-xl bg-call-card-2 px-3 text-[15px] font-semibold disabled:opacity-40">
          Send
        </button>
      </form>

      <footer className="flex gap-3 px-4 pt-2 pb-[max(env(safe-area-inset-bottom),16px)]">
        {live ? (
          <button onClick={voice.stop} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-call-control text-[17px] font-semibold">
            Pause
          </button>
        ) : (
          <button onClick={voice.start} disabled={voice.state === "starting"} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-blue text-[17px] font-semibold text-white">
            <MicIcon size={22} />
            {session.turns.length ? "Resume" : "Start translation"}
          </button>
        )}
        <button onClick={end} className="h-14 rounded-2xl bg-end px-5 text-[17px] font-semibold text-white">
          End
        </button>
      </footer>
      <p className="px-4 pb-3 text-center text-[11px] leading-snug text-call-muted">
        Vital translates and organizes information. It does not diagnose and does not replace emergency services or a professional interpreter.
      </p>
    </main>
  );
}
