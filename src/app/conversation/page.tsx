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
import { LiveReport } from "@/components/LiveReport";
import { loadApprovals, loadCountry, loadMeta, loadSession, saveSession, type StoredSession } from "@/lib/session-store";
import { findCountry } from "@/data/emergency-numbers";
import { blankProfile, buildSharedProfile, type SharedProfile } from "@/lib/sharing";
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
  const [callMode, setCallMode] = useState(false);
  const [callNumber, setCallNumber] = useState(emergency.number);
  /** null until both people choose; true = speak translations in each person's cloned voice. */
  const [cloneConsent, setCloneConsent] = useState<boolean | null>(null);
  const cloneConsentRef = useRef(false);
  const [cloned, setCloned] = useState<Partial<Record<"patient" | "clinician", boolean>>>({});
  const [cloneFailed, setCloneFailed] = useState(false);
  const sessionRef = useRef(session);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = loadProfile();
    if (p) setProfile(buildSharedProfile(p, loadMeta(), loadApprovals()));
    const params = new URLSearchParams(window.location.search);
    setDebug(params.has("debug"));
    setCallMode(params.has("call"));
    const picked = findCountry(loadCountry());
    if (picked) setCallNumber(picked.medical);
    // A uuid id lets /api/turn store each turn in Supabase (the session row is created on the first turn).
    // After the talk with Vital, continue that same session so the report carries over.
    const prior = loadSession();
    if (prior?.stage === "intake_done" || prior?.stage === "translating") setSession({ ...prior, stage: "translating" });
    else setSession((s) => ({ ...s, sessionId: crypto.randomUUID(), startedAt: new Date().toISOString() }));
  }, []);

  useEffect(() => {
    sessionRef.current = session;
    if (session.sessionId) saveSession(session);
  }, [session]);
  useEffect(() => {
    // Braces matter: Chrome's smooth scrollTo returns a Promise, which React would call as cleanup.
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [session.turns.length, pending]);

  const speakText = useCallback(async (text: string, lang: Lang, play: (b: Blob) => Promise<void>, voiceId?: string) => {
    const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang, voiceId }) });
    if (res.ok) await play(await res.blob());
  }, []);

  // ---- Voice cloning (only with consent): each speaker's translations are spoken in their own voice.
  // The clone is made from their first spoken sentence and deleted when the session ends.
  const clonesRef = useRef<Partial<Record<"patient" | "clinician", Promise<string | null>>>>({});
  const cloneIdsRef = useRef<string[]>([]);

  const startClone = useCallback((speaker: "patient" | "clinician", audio: Blob) => {
    if (clonesRef.current[speaker]) return;
    const form = new FormData();
    form.append("speaker", speaker);
    form.append("audio", audio, `${speaker}-sample`);
    clonesRef.current[speaker] = fetch("/api/voice", { method: "POST", body: form })
      .then((r) => (r.ok ? (r.json() as Promise<{ voiceId: string }>) : Promise.reject(new Error(String(r.status)))))
      .then(({ voiceId }) => {
        cloneIdsRef.current.push(voiceId);
        setCloned((c) => ({ ...c, [speaker]: true }));
        return voiceId;
      })
      .catch(() => {
        setCloneFailed(true);
        return null;
      });
  }, []);

  /** The speaker's clone, waiting at most a few seconds for one still being made. */
  const voiceFor = useCallback(async (speaker: "patient" | "clinician") => {
    const p = clonesRef.current[speaker];
    if (!p) return undefined;
    const id = await Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), 8000))]);
    return id ?? undefined;
  }, []);

  const deleteClones = useCallback(() => {
    for (const id of cloneIdsRef.current) fetch(`/api/voice?id=${id}`, { method: "DELETE", keepalive: true }).catch(() => {});
    cloneIdsRef.current = [];
    clonesRef.current = {};
  }, []);

  useEffect(() => {
    window.addEventListener("pagehide", deleteClones);
    return () => {
      window.removeEventListener("pagehide", deleteClones);
      deleteClones();
    };
  }, [deleteClones]);

  // One utterance through the pipeline: translate, show, speak.
  const handleText = useCallback(
    async (original: string, detected: Lang | null, play: (b: Blob) => Promise<void>, audio?: Blob) => {
      // Start cloning in parallel with the translation so it adds little wait.
      if (audio && cloneConsentRef.current) startClone(detected === "es" ? "clinician" : "patient", audio);
      setPending({ original, lang: detected });
      setCurrentLang(detected);
      setPhase("translating");
      const s = sessionRef.current;
      const body: TurnRequest = {
        sessionId: s.sessionId,
        transcript: original,
        detected_lang: detected ?? undefined,
        profile: profile ?? blankProfile,
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
      const t: SessionTurn = { speaker: turn.speaker, source_lang: turn.source_lang, original, translation: turn.translation, at: new Date().toISOString(), grounding: turn.grounding };
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
      await speakText(turn.translation, target, play, cloneConsentRef.current ? await voiceFor(turn.speaker) : undefined);
      // New warnings are read aloud in both languages, in Vital's own (standard) voices.
      for (const w of fresh) {
        await speakText(w.message.en, "en", play);
        await speakText(w.message.es, "es", play);
      }
    },
    [profile, speakText, startClone, voiceFor],
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
        if (stt.text && stt.text.replace(/[^\p{L}\p{N}]/gu, "").length > 1) await handleText(stt.text, stt.lang, voice.play, audio);
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
    deleteClones();
    saveSession({ ...sessionRef.current, stage: "ended", endedAt: new Date().toISOString() });
    router.push("/report");
  }

  const open = useMemo(() => [...session.warnings].reverse().filter((w) => !w.resolution), [session.warnings]);
  const live = voice.state === "listening" || voice.state === "hearing" || voice.state === "paused";
  const hearing = voice.state === "hearing";
  const statusText = !live
    ? session.turns.length
      ? "Paused · En pausa"
      : "Tap Start, then speak · Toque Iniciar y hable"
    : hearing
      ? "Listening… · Escuchando…"
      : phase === "transcribing"
        ? "Writing it down… · Transcribiendo…"
        : phase === "translating"
          ? "Translating… · Traduciendo…"
          : phase === "speaking"
            ? `Speaking ${currentLang === "en" ? "Spanish" : "English"}…`
            : "Listening… · Escuchando…";
  const glow = live ? 0.35 + voice.level * 0.65 : 0.15;

  function chooseClone(on: boolean) {
    cloneConsentRef.current = on;
    setCloneConsent(on);
  }

  async function replay(t: SessionTurn) {
    if (phase !== "idle") return;
    setPhase("speaking");
    try {
      await speakText(t.translation, t.source_lang === "en" ? "es" : "en", voice.play, cloneConsentRef.current ? await voiceFor(t.speaker) : undefined);
    } finally {
      setPhase("idle");
    }
  }

  return (
    <main className="relative mx-auto flex h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-[#0e0f11] text-white">
      <header className="flex items-center justify-between gap-2 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3">
        <Link href="/" aria-label="Back" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 active:bg-white/10">
          <ChevronLeftIcon />
        </Link>
        <div className="flex items-center gap-1.5" aria-label="English and Spanish, detected automatically">
          <span className={`rounded-2xl px-3.5 py-2.5 text-[16px] font-medium ${currentLang === "en" && live ? "bg-[#8ab4f8]/20 text-[#d2e3fc]" : "bg-white/[0.06]"}`}>English</span>
          <SwapIcon />
          <span className={`rounded-2xl px-3.5 py-2.5 text-[16px] font-medium ${currentLang === "es" && live ? "bg-[#8ab4f8]/20 text-[#d2e3fc]" : "bg-white/[0.06]"}`}>Español</span>
        </div>
        <a href={`tel:${callNumber}`} aria-label={`Call emergency services ${callNumber}`} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e5332a] active:opacity-80">
          <PhoneIcon />
        </a>
      </header>

      {callMode && (
        <p className="mx-4 mb-2 rounded-2xl bg-white/[0.06] px-4 py-2.5 text-[14px] leading-snug text-white/75">
          On a call? Put it on speaker and place the phone near you. Vital translates both sides.
        </p>
      )}

      {cloneConsent && (
        <p className="mx-4 mb-2 text-center text-[13px] text-white/55">
          {cloneFailed
            ? "Voice copying unavailable, using standard voices"
            : `Own voices: patient ${cloned.patient ? "✓" : "after first sentence"} · doctor ${cloned.clinician ? "✓" : "after first sentence"}`}
        </p>
      )}

      {debug && (
        <p className="mx-4 mb-2 font-mono text-[11px] text-white/50">
          rms {voice.stats.rms.toFixed(4)} · floor {voice.stats.floor.toFixed(4)} · threshold {voice.stats.threshold.toFixed(4)} · mic {voice.state}
        </p>
      )}

      {open.length > 0 && (
        <section className="mx-4 mb-2 max-h-[30dvh] space-y-2 overflow-y-auto" aria-live="assertive">
          {open.map((w) => (
            <div key={w.id} className="rounded-3xl bg-[#5c1a17] p-4 text-[#ffdad6]">
              <div className="flex gap-2.5">
                <AlertIcon size={20} className="mt-0.5 shrink-0 text-[#ffb4ab]" />
                <div className="min-w-0 text-[15px] leading-snug">
                  <p className="font-semibold text-white">{w.message.en}</p>
                  <p className="mt-1 opacity-85">{w.message.es}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2 pl-[30px] text-[13px] font-semibold">
                <button onClick={() => review(w.id, "confirmed")} className="rounded-full bg-[#ffb4ab] px-3.5 py-2 text-[#5c1a17] active:opacity-80">Reviewed · Revisado</button>
                <button onClick={() => review(w.id, "corrected")} className="rounded-full border border-[#ffb4ab]/50 px-3.5 py-2 active:bg-white/10">Profile wrong</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Transcript: newest at the bottom, like a conversation. */}
      <div ref={scrollRef} className="flex flex-1 flex-col overflow-y-auto">
        <div className="mt-auto" />
        {session.turns.length === 0 && !pending && (
          <div className="px-6 pb-10 text-center">
            <p className="text-[26px] font-medium leading-tight text-white/90">Put the phone between you and talk.</p>
            <p className="mt-2 text-[20px] leading-tight text-white/45">Ponga el teléfono entre ustedes y hablen.</p>
            {cloneConsent === null && (
              <div className="mx-auto mt-6 max-w-[340px] rounded-3xl bg-[#1b1c1f] p-5 text-left">
                <p className="text-[17px] font-semibold">Speak in your own voices?</p>
                <p className="mt-1 text-[14px] leading-snug text-white/60">
                  Vital can copy each person&apos;s voice from their first sentence, so the translation sounds like them. The copies are deleted when you end.
                </p>
                <p className="mt-1 text-[13px] leading-snug text-white/45">¿Usar sus propias voces? Vital copia la voz de cada persona y la borra al terminar.</p>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => chooseClone(true)} className="h-11 flex-1 rounded-full bg-[#8ab4f8] text-[15px] font-semibold text-[#0e0f11]">
                    We agree · Sí
                  </button>
                  <button onClick={() => chooseClone(false)} className="h-11 flex-1 rounded-full bg-white/[0.08] text-[15px] font-semibold">
                    Standard voices
                  </button>
                </div>
              </div>
            )}
            {!profile && (
              <Link href="/share" className="mt-6 inline-block rounded-full bg-white/[0.08] px-4 py-2 text-[14px] font-medium text-[#8ab4f8]">
                Share your medical profile first
              </Link>
            )}
          </div>
        )}
        {session.turns.map((t, i) => {
          const latest = i === session.turns.length - 1 && !pending;
          const from = t.source_lang === "en" ? "English" : "Spanish";
          const to = t.source_lang === "en" ? "Spanish" : "English";
          return (
            <article key={i} className={`border-t border-white/[0.07] px-5 py-4 ${latest ? "rounded-t-[28px] border-t-0 bg-[#1b1c1f] pb-6" : ""}`}>
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 text-[15px] text-white/60">
                  <span className="sr-only">{t.speaker === "patient" ? "Patient" : "Clinician"}: </span>
                  {from} → {to}
                  <span className="ml-2 text-[13px] text-white/35">{t.speaker === "patient" ? "Patient" : "Doctor"}</span>
                </p>
                <IconButton label="Copy translation" onClick={() => navigator.clipboard?.writeText(t.translation).catch(() => {})}>
                  <CopyIcon />
                </IconButton>
                <IconButton label="Play translation again" onClick={() => replay(t)}>
                  <SpeakerIcon />
                </IconButton>
              </div>
              {latest ? (
                <>
                  <p className="mt-3 text-[20px] leading-snug text-white/60">{t.original}</p>
                  <div className="my-3 h-px bg-white/10" />
                  <p className="text-[30px] leading-[1.2] text-white">{t.translation}</p>
                </>
              ) : (
                <p className="mt-2 text-[22px] leading-snug text-white/85">{t.translation}</p>
              )}
              {latest &&
                t.grounding?.map((c) => (
                  <p key={c.id} className="mt-3 border-l-2 border-white/20 pl-2 text-[13px] leading-snug text-white/50">
                    <span className="font-semibold">Report · Reporte:</span> {t.source_lang === "en" ? c.text.es : c.text.en}
                    {c.quote ? ` “${c.quote}”` : ""}
                  </p>
                ))}
            </article>
          );
        })}
        {pending && (
          <article className="rounded-t-[28px] bg-[#1b1c1f] px-5 py-4 pb-6">
            <p className="text-[15px] text-white/60">{pending.lang === "es" ? "Spanish → English" : pending.lang === "en" ? "English → Spanish" : "Detecting language…"}</p>
            <p className="mt-3 text-[20px] leading-snug text-white/60">{pending.original}</p>
            <div className="my-3 h-px bg-white/10" />
            <div className="space-y-2" aria-label="Translating">
              <div className="h-6 w-4/5 animate-pulse rounded-lg bg-white/10" />
              <div className="h-6 w-1/2 animate-pulse rounded-lg bg-white/10" />
            </div>
          </article>
        )}
      </div>

      <LiveReport sessionId={session.sessionId} />

      {(voice.error || failure) && (
        <p role="alert" className="mx-4 mb-2 rounded-2xl bg-[#5c1a17] p-3 text-[14px] leading-snug text-[#ffdad6]">
          {voice.error ?? failure}
        </p>
      )}

      {showKeyboard && (
        <form onSubmit={sendTyped} className="mx-4 mb-2 flex gap-2">
          <div className="flex shrink-0 rounded-2xl bg-white/[0.07] p-1 text-[13px] font-bold" role="radiogroup" aria-label="Typed message language">
            {(["en", "es"] as Lang[]).map((l) => (
              <button key={l} type="button" role="radio" aria-checked={typedLang === l} onClick={() => setTypedLang(l)} className={`rounded-xl px-2.5 ${typedLang === l ? "bg-white/15 text-white" : "text-white/50"}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type instead · Escribir"
            autoFocus
            className="min-w-0 flex-1 rounded-2xl bg-white/[0.07] px-4 py-3 text-[16px] text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#8ab4f8]"
          />
          <button type="submit" disabled={!typed.trim() || phase !== "idle"} className="rounded-2xl bg-[#8ab4f8] px-4 text-[15px] font-semibold text-[#0e0f11] disabled:opacity-40">
            Send
          </button>
        </form>
      )}

      {/* Bottom dock: glow that follows the voice, status, controls. */}
      <footer className="relative px-4 pt-6 pb-[max(env(safe-area-inset-bottom),16px)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 -top-2 h-20 rounded-[50%] blur-2xl transition-opacity duration-150"
          style={{ opacity: glow, background: "radial-gradient(60% 100% at 50% 0%, #4fd1c5 0%, #4285f4 45%, transparent 75%)" }}
        />
        <p className="relative text-center text-[17px] font-medium text-white/85" aria-live="polite">
          {statusText}
        </p>

        <div className="relative mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => setShowKeyboard((v) => !v)}
            aria-label="Type a message"
            aria-pressed={showKeyboard}
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${showKeyboard ? "bg-white/20" : "bg-white/[0.08]"} active:bg-white/20`}
          >
            <KeyboardIcon />
          </button>

          {live ? (
            <button
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                voice.holdStart();
              }}
              onPointerUp={voice.holdEnd}
              onPointerCancel={voice.holdEnd}
              onContextMenu={(e) => e.preventDefault()}
              disabled={phase !== "idle"}
              className="flex h-14 min-w-0 flex-1 select-none items-center justify-center gap-2 rounded-full bg-white/[0.08] text-[16px] font-medium [-webkit-touch-callout:none] active:bg-white/20 disabled:opacity-40"
            >
              <MicIcon size={20} /> Hold to talk
            </button>
          ) : (
            <button
              onClick={() => voice.start()}
              disabled={voice.state === "starting"}
              className="flex h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-[#8ab4f8] text-[17px] font-semibold text-[#0e0f11] active:opacity-85"
            >
              <MicIcon size={22} /> {session.turns.length ? "Resume" : "Start translation"}
            </button>
          )}

          {live ? (
            <button onClick={() => voice.stop()} aria-label="Pause translation" className="flex h-14 w-24 shrink-0 items-center justify-center rounded-full bg-[#e5332a] active:opacity-85">
              <PauseIcon />
            </button>
          ) : (
            <button onClick={end} className="flex h-14 w-24 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[16px] font-semibold active:bg-white/20">
              End
            </button>
          )}
        </div>

        <p className="relative mt-4 text-center text-[11px] leading-snug text-white/35">
          Vital translates and organizes. It does not diagnose or replace emergency services or a professional interpreter.
        </p>
      </footer>
    </main>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-white/80 active:bg-white/15">
      {children}
    </button>
  );
}

function SwapIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mx-0.5 text-white/60" aria-hidden="true">
      <path d="M4 9h15l-4-4M20 15H5l4 4" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9.5v5h3.5L12 18V6L7.5 9.5z" fill="currentColor" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </svg>
  );
}

function KeyboardIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
      <path d="M6.5 9.5h1M10.5 9.5h1M14.5 9.5h1M17.5 9.5h.5M6.5 12.5h1M10.5 12.5h1M14.5 12.5h1M8 15.5h8" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6.5" y="5" width="4" height="14" rx="1.2" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.2" />
    </svg>
  );
}
