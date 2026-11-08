"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { demoLocation } from "@/data";
import { AlertIcon, ChevronLeftIcon, MicIcon } from "@/components/icons";
import type { Lang, Note, TurnRequest, TurnResponse } from "@/lib/contract";
import { emergencyNumber } from "@/lib/emergency";
import { loadProfile } from "@/lib/profile-store";
import { mergeAlerts } from "@/lib/safety-checks";
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
const emergency = emergencyNumber(demoLocation.country);

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
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [debug, setDebug] = useState(false);
  const sessionRef = useRef(session);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = loadProfile();
    if (p) setProfile(buildSharedProfile(p, loadMeta(), loadApprovals()));
    setDebug(new URLSearchParams(window.location.search).has("debug"));
    // A uuid id lets /api/turn store each turn in Supabase (the session row is created on the first turn).
    setSession((s) => ({ ...s, sessionId: crypto.randomUUID(), startedAt: new Date().toISOString() }));
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
      // Same rule as the server: earlier warnings win, duplicates from later turns are dropped.
      const fresh = mergeAlerts(s.warnings, turn.alerts).slice(s.warnings.length);
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

  const open = useMemo(() => [...session.warnings].reverse().filter((w) => !w.resolution), [session.warnings]);
  const live = voice.state === "listening" || voice.state === "hearing" || voice.state === "paused";
  const hearing = voice.state === "hearing";
  const status = !live
    ? { en: "Tap the mic to start", es: "Toque el micrófono para empezar" }
    : hearing
      ? { en: "Hearing you…", es: "Escuchando…" }
      : phase === "idle"
        ? { en: "Listening — speak English or Spanish", es: "Escuchando — hable en inglés o español" }
        : phase === "speaking"
          ? { en: `Speaking ${currentLang === "en" ? "Spanish" : "English"}`, es: `Hablando en ${currentLang === "en" ? "español" : "inglés"}` }
          : phaseLabel[phase];

  return (
    <main className="mx-auto flex h-dvh w-full max-w-[480px] flex-col bg-call text-call-ink">
      <header className="flex items-center justify-between px-3 pt-[max(env(safe-area-inset-top),10px)] pb-2">
        <Link href="/share" aria-label="Back to profile" className="flex h-11 w-11 items-center justify-center rounded-full text-call-muted active:bg-call-control">
          <ChevronLeftIcon />
        </Link>
        <div className="flex flex-col items-center leading-tight">
          <span className="text-[17px] font-bold tracking-tight">Vital</span>
          <span className="text-[12px] font-medium text-call-muted">English ⇄ Español</span>
        </div>
        <a href={`tel:${emergency.number}`} className="flex h-9 items-center rounded-full bg-end px-3.5 text-[14px] font-bold text-white active:opacity-80">
          Call {emergency.number}
        </a>
      </header>

      <div className="mx-3 mb-2 flex items-center gap-2.5 rounded-full bg-call-card px-3.5 py-2" aria-live="polite">
        <span className={`h-2 w-2 shrink-0 rounded-full ${live ? (hearing ? "bg-live" : "bg-live/60") : "bg-call-control"} ${hearing ? "animate-pulse" : ""}`} />
        <p className="min-w-0 flex-1 truncate text-[14px]">
          <span className="font-semibold">{status.en}</span>
          <span className="text-call-muted"> · {status.es}</span>
        </p>
        {phase !== "idle" && <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-call-muted border-t-transparent" aria-hidden="true" />}
      </div>

      {debug && (
        <p className="mx-3 mb-2 font-mono text-[11px] text-call-muted">
          rms {voice.stats.rms.toFixed(4)} · floor {voice.stats.floor.toFixed(4)} · threshold {voice.stats.threshold.toFixed(4)} · mic {voice.state}
        </p>
      )}

      {open.length > 0 && (
        <section className="mx-3 mb-2 max-h-[34dvh] space-y-2 overflow-y-auto" aria-live="assertive">
          {open.map((w) => (
            <div key={w.id} className="rounded-2xl border border-red/40 bg-red-soft p-3 text-red shadow-[0_6px_20px_rgba(0,0,0,0.25)]">
              <div className="flex gap-2.5">
                <AlertIcon size={20} className="mt-0.5 shrink-0" />
                <div className="min-w-0 text-[14px] leading-snug">
                  <p className="font-semibold">{w.message.en}</p>
                  <p className="mt-1 opacity-90">{w.message.es}</p>
                </div>
              </div>
              <div className="mt-2.5 flex gap-2 pl-[30px] text-[13px] font-semibold">
                <button onClick={() => review(w.id, "confirmed")} className="rounded-full bg-red px-3 py-1.5 text-white active:opacity-80">Reviewed · Revisado</button>
                <button onClick={() => review(w.id, "corrected")} className="rounded-full border border-red/50 px-3 py-1.5 active:bg-red/10">Profile wrong · Corregir</button>
              </div>
            </div>
          ))}
        </section>
      )}

      <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 pt-1 pb-4">
        {session.turns.length === 0 && !pending && (
          <div className="m-auto max-w-[320px] text-center">
            <p className="text-[22px] font-bold leading-tight">Put the phone between you and talk.</p>
            <p className="mt-1 text-[17px] text-call-muted">Ponga el teléfono entre ustedes y hablen.</p>
            <p className="mt-4 text-[14px] leading-relaxed text-call-muted">
              Vital waits for each person to pause, then says it in the other language. In a noisy room, hold the talk button while speaking.
            </p>
            {!profile && (
              <Link href="/share" className="mt-4 inline-block rounded-full bg-call-card-2 px-4 py-2 text-[14px] font-semibold">
                No profile shared yet — review it first
              </Link>
            )}
          </div>
        )}
        {session.turns.map((t, i) => {
          const patient = t.speaker === "patient";
          return (
            <article key={i} className={`max-w-[88%] rounded-3xl px-4 py-3 ${patient ? "self-start rounded-bl-md bg-call-card" : "self-end rounded-br-md bg-call-card-2"}`}>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-call-muted">
                {patient ? "Patient · Paciente" : "Clinician · Médico"} · {t.source_lang.toUpperCase()} → {t.source_lang === "en" ? "ES" : "EN"}
              </p>
              <p className="mt-1.5 text-[19px] font-semibold leading-snug">{t.translation}</p>
              <p className="mt-1.5 text-[14px] leading-snug text-call-muted">“{t.original}”</p>
            </article>
          );
        })}
        {pending && (
          <article className={`max-w-[88%] rounded-3xl px-4 py-3 opacity-80 ${pending.lang === "es" ? "self-end rounded-br-md bg-call-card-2" : "self-start rounded-bl-md bg-call-card"}`}>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-call-muted">{pending.lang ? langName(pending.lang) : "Detecting"} · translating…</p>
            <p className="mt-1.5 text-[15px] text-call-muted">“{pending.original}”</p>
          </article>
        )}
      </div>

      {(voice.error || failure) && (
        <p role="alert" className="mx-3 mb-2 rounded-2xl bg-red-soft p-3 text-[14px] leading-snug text-red">
          {voice.error ?? failure}
        </p>
      )}

      {showKeyboard && (
        <form onSubmit={sendTyped} className="mx-3 mb-2 flex gap-2">
          <div className="flex shrink-0 rounded-xl bg-call-control p-1 text-[13px] font-bold" role="radiogroup" aria-label="Typed message language">
            {(["en", "es"] as Lang[]).map((l) => (
              <button key={l} type="button" role="radio" aria-checked={typedLang === l} onClick={() => setTypedLang(l)} className={`rounded-lg px-2.5 ${typedLang === l ? "bg-call-card-2 text-call-ink" : "text-call-muted"}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type instead · Escribir"
            autoFocus
            className="min-w-0 flex-1 rounded-xl bg-call-control px-3 py-2.5 text-[16px] text-call-ink placeholder:text-call-muted"
          />
          <button type="submit" disabled={!typed.trim() || phase !== "idle"} className="rounded-xl bg-blue px-4 text-[15px] font-semibold text-white disabled:opacity-40">
            Send
          </button>
        </form>
      )}

      <footer className="px-3 pt-1 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowKeyboard((v) => !v)}
            aria-label="Type a message"
            aria-pressed={showKeyboard}
            className={`flex h-14 w-14 items-center justify-center rounded-full ${showKeyboard ? "bg-call-card-2" : "bg-call-control"} active:opacity-80`}
          >
            <KeyboardIcon />
          </button>

          <div className="flex flex-col items-center">
            <button
              onClick={live ? voice.stop : voice.start}
              disabled={voice.state === "starting"}
              aria-label={live ? "Pause translation" : "Start translation"}
              className={`relative flex h-20 w-20 items-center justify-center rounded-full text-white transition-[box-shadow,background-color] duration-100 ${live ? "bg-live text-call" : "bg-blue"}`}
              style={live ? { boxShadow: `0 0 0 ${6 + voice.level * 22}px rgba(61,220,132,${0.12 + voice.level * 0.2})` } : undefined}
            >
              {live ? <PauseIcon /> : <MicIcon size={32} />}
            </button>
          </div>

          <button onClick={end} className="flex h-14 min-w-14 items-center justify-center rounded-full bg-end px-5 text-[16px] font-bold text-white active:opacity-80">
            End
          </button>
        </div>

        <p className="mt-2 text-center text-[13px] font-semibold text-call-muted">{live ? "Tap to pause · Pausar" : session.turns.length ? "Tap to resume · Reanudar" : "Start translation · Iniciar"}</p>

        {live && (
          <button
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              voice.holdStart();
            }}
            onPointerUp={voice.holdEnd}
            onPointerCancel={voice.holdEnd}
            onContextMenu={(e) => e.preventDefault()}
            disabled={phase !== "idle"}
            className="mt-3 h-12 w-full select-none rounded-2xl bg-call-card text-[15px] font-semibold text-call-ink [-webkit-touch-callout:none] active:bg-call-card-2 disabled:opacity-40"
          >
            Hold to talk · Mantener para hablar
          </button>
        )}

        <p className="mt-3 text-center text-[11px] leading-snug text-call-muted">
          Vital translates and organizes information. It does not diagnose and does not replace emergency services or a professional interpreter.
        </p>
      </footer>
    </main>
  );
}

function KeyboardIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
      <path d="M6.5 9.5h1M10.5 9.5h1M14.5 9.5h1M17.5 9.5h.5M6.5 12.5h1M10.5 12.5h1M14.5 12.5h1M8 15.5h8" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width={30} height={30} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6.5" y="5" width="4" height="14" rx="1.2" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.2" />
    </svg>
  );
}
