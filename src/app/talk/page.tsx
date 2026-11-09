"use client";

// Live translation, hands-free. Matches the original mockup (mockups/app-screens.html, screen 2).
//
// Flow: listen for the patient (English) -> POST /api/turn -> show the translation,
// then say it in Spanish -> listen for the doctor (Spanish) -> translate to English
// -> say it -> back to the patient. The mic is off while the phone is speaking
// (half-duplex), so a shared phone never hears itself.
//
// Speech in/out uses the browser's built-in engines for now. The ElevenLabs
// Scribe/Flash hooks can replace `listen` and `say` without touching the UI.
//
// If the browser can't do speech recognition, or the URL has ?demo=1, it plays the
// sample conversation instead so the demo never stalls.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertIcon, EndCallIcon, MicIcon, MicOffIcon } from "@/components/icons";
import { demoProfile, demoTurns, type Alert, type Speaker } from "@/data";
import type { TurnResponse } from "@/lib/contract";
import { loadProfile } from "@/lib/profile-store";

type Phase = "starting" | "needs-tap" | "listening" | "translating" | "speaking" | "muted";
type Caption = { id: number; speaker: Speaker; original: string; translation?: string; alerts: Alert[]; error?: string };

const LANG: Record<Speaker, { stt: string; code: "en" | "es"; name: string }> = {
  patient: { stt: "en-US", code: "en", name: "English" },
  clinician: { stt: "es-MX", code: "es", name: "Español" },
};
const other = (s: Speaker): Speaker => (s === "patient" ? "clinician" : "patient");

// ---------- browser speech helpers ----------

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};

function getRecognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function say(text: string, lang: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof speechSynthesis === "undefined" || !text) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    const voice = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2)));
    if (voice) u.voice = voice;
    // Safety net: some browsers never fire onend.
    const timer = setTimeout(resolve, 2000 + text.length * 90);
    u.onend = u.onerror = () => {
      clearTimeout(timer);
      resolve();
    };
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- page ----------

export default function TalkPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("starting");
  const [next, setNext] = useState<Speaker>("patient");
  const [interim, setInterim] = useState("");
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [demo, setDemo] = useState(false);

  const recRef = useRef<Recognition | null>(null);
  const alive = useRef(true);
  const mutedRef = useRef(false);
  const nextRef = useRef<Speaker>("patient");
  const historyRef = useRef<{ speaker: Speaker; original: string }[]>([]);
  const sessionId = useRef<string>("");
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const listenRef = useRef<() => void>(() => {});

  const setSpeaker = (s: Speaker) => {
    nextRef.current = s;
    setNext(s);
  };

  // ---- one turn: translate, show, speak ----
  const runTurn = useCallback(async (speaker: Speaker, text: string) => {
    const id = ++idRef.current;
    setCaptions((c) => [...c, { id, speaker, original: text, alerts: [] }]);
    setPhase("translating");
    let res: TurnResponse | null = null;
    try {
      const r = await fetch("/api/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId.current,
          transcript: text,
          detected_lang: LANG[speaker].code,
          profile: loadProfile() ?? demoProfile,
          history: historyRef.current.slice(-6),
        }),
      });
      if (r.ok) res = (await r.json()) as TurnResponse;
    } catch {
      /* handled below */
    }
    if (!alive.current) return false;
    if (!res) {
      setCaptions((c) => c.map((x) => (x.id === id ? { ...x, error: "Couldn't translate. Say it again." } : x)));
      return false;
    }
    const turn = res;
    historyRef.current.push({ speaker, original: text });
    setCaptions((c) => c.map((x) => (x.id === id ? { ...x, translation: turn.translation, alerts: turn.alerts } : x)));
    setPhase("speaking");
    const outLang = LANG[other(speaker)].stt;
    await say(turn.translation, outLang);
    for (const a of turn.alerts) await say(speaker === "patient" ? a.message.es : a.message.en, outLang);
    return true;
  }, []);

  // ---- listen once in the current speaker's language ----
  const listen = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || !alive.current || mutedRef.current) return;
    const speaker = nextRef.current;
    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = LANG[speaker].stt;
    rec.continuous = false;
    rec.interimResults = true;
    let finalText = "";
    let blocked = false;
    setInterim("");
    setPhase("listening");

    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText = text;
      }
      setInterim(text);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") blocked = true;
    };
    rec.onend = async () => {
      if (recRef.current === rec) recRef.current = null;
      if (!alive.current || mutedRef.current) return;
      if (blocked) return setPhase("needs-tap");
      const text = finalText.trim();
      setInterim("");
      if (!text) return listenRef.current(); // silence: keep listening, same person
      const ok = await runTurn(speaker, text);
      if (!alive.current) return;
      if (ok) setSpeaker(other(speaker)); // hand over to the other person
      if (!mutedRef.current) listenRef.current();
    };
    try {
      rec.start();
    } catch {
      setPhase("needs-tap");
    }
  }, [runTurn]);
  useEffect(() => {
    listenRef.current = listen;
  }, [listen]);

  // ---- sample conversation (no speech recognition, or ?demo=1) ----
  const playDemo = useCallback(async () => {
    for (const t of demoTurns) {
      if (!alive.current) return;
      while (mutedRef.current && alive.current) await wait(300);
      setSpeaker(t.speaker);
      setPhase("listening");
      const words = t.original.split(" ");
      for (let i = 1; i <= words.length && alive.current; i++) {
        setInterim(words.slice(0, i).join(" "));
        await wait(110);
      }
      setInterim("");
      const id = ++idRef.current;
      setCaptions((c) => [...c, { id, speaker: t.speaker, original: t.original, alerts: [] }]);
      setPhase("translating");
      await wait(900);
      setCaptions((c) => c.map((x) => (x.id === id ? { ...x, translation: t.translation, alerts: t.alerts } : x)));
      setPhase("speaking");
      await say(t.translation, LANG[other(t.speaker)].stt);
      await wait(500);
    }
    if (alive.current) setPhase("muted");
  }, []);

  const start = useCallback(() => {
    // Unlock audio on iOS: speech output must start inside a tap.
    if (typeof speechSynthesis !== "undefined") speechSynthesis.speak(new SpeechSynthesisUtterance(""));
    const wantsDemo = new URLSearchParams(window.location.search).has("demo") || !getRecognitionCtor();
    setDemo(wantsDemo);
    if (wantsDemo) void playDemo();
    else listen();
  }, [listen, playDemo]);

  useEffect(() => {
    alive.current = true;
    sessionId.current = crypto.randomUUID();
    const boot = setTimeout(start, 0);
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      alive.current = false;
      clearTimeout(boot);
      clearInterval(t);
      recRef.current?.abort();
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    };
  }, [start]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [captions, interim]);

  function toggleMute() {
    if (mutedRef.current) {
      mutedRef.current = false;
      if (demo) setPhase("listening");
      else listen();
    } else {
      mutedRef.current = true;
      recRef.current?.abort();
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
      setInterim("");
      setPhase("muted");
    }
  }

  function flipSpeaker() {
    if (demo) return;
    setSpeaker(other(nextRef.current));
    // Aborting with no text ends the current listen; onend restarts it in the new language.
    if (phase === "listening") recRef.current?.abort();
  }

  function end() {
    alive.current = false;
    recRef.current?.abort();
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    router.push("/s/demo");
  }

  const who = next === "patient" ? "you" : "the doctor";
  const status: Record<Phase, string> = {
    starting: "Starting…",
    "needs-tap": "Tap the circle to start",
    listening: `Listening to ${who} · ${LANG[next].name}`,
    translating: "Translating…",
    speaking: next === "patient" ? "Speaking to the doctor in Spanish" : "Speaking to you in English",
    muted: "Paused",
  };
  const active = phase === "listening" || phase === "speaking";
  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <main className="mx-auto flex h-dvh w-full max-w-[480px] flex-col bg-call text-white pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),16px)]">
      {/* full-bleed dark background on wide screens */}
      <style>{`body{background:var(--color-call)}`}</style>

      <header className="px-5 text-center">
        <p className="inline-flex items-center gap-2 text-[15px] font-semibold text-call-muted">
          <span className={`size-[9px] rounded-full ${phase === "muted" ? "bg-call-muted" : "bg-live"}`} />
          {demo ? "Sample conversation" : "Live"} · {mmss}
        </p>
        <button
          type="button"
          onClick={flipSpeaker}
          aria-label={`Now listening to ${who}. Tap to switch.`}
          className="mt-1.5 block w-full text-[24px] font-bold"
        >
          English ⇄ Español
        </button>
      </header>

      <section className="flex flex-col items-center pt-7 pb-5">
        <button
          type="button"
          onClick={phase === "needs-tap" ? start : undefined}
          aria-label={phase === "needs-tap" ? "Start translating" : status[phase]}
          className="grid size-[150px] place-items-center rounded-full bg-blue shadow-[0_0_0_14px_rgba(31,91,216,0.28),0_0_0_28px_rgba(31,91,216,0.12)]"
        >
          {phase === "needs-tap" ? (
            <MicIcon size={56} />
          ) : phase === "translating" ? (
            <span className="size-12 animate-spin rounded-full border-4 border-white/25 border-t-white" />
          ) : (
            <span className="flex h-[70px] items-center gap-1.5" aria-hidden="true">
              {[22, 46, 70, 38, 58, 28, 16].map((h, i) => (
                <i
                  key={i}
                  className="block w-[7px] rounded bg-white"
                  style={{
                    height: h,
                    transform: active ? undefined : "scaleY(0.25)",
                    animation: active ? `vital-wave ${0.7 + (i % 3) * 0.18}s ease-in-out ${i * 0.08}s infinite` : "none",
                  }}
                />
              ))}
            </span>
          )}
        </button>
        <p className="mt-10 text-[17px] font-semibold text-call-ink" role="status" aria-live="polite">
          {status[phase]}
        </p>
      </section>

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-5">
        {captions.length === 0 && !interim ? (
          <p className="mt-2 text-center text-[15px] leading-[1.45] text-call-muted">
            Just talk. Vital translates each of you automatically.
          </p>
        ) : null}
        {captions.map((c) => (
          <div key={c.id} className={`rounded-2xl px-4 py-3.5 ${c.speaker === "patient" ? "bg-call-card-2" : "bg-call-card"}`}>
            <p className="text-[13px] font-semibold text-call-muted">{c.speaker === "patient" ? "You said" : "Doctor said"}</p>
            <p className="mt-1 text-[15px] text-[#C9D6EE]">{c.original}</p>
            {c.translation ? (
              <p className="mt-1 text-[19px] font-semibold leading-[1.3]">“{c.translation}”</p>
            ) : c.error ? (
              <p className="mt-1 text-[15px] font-semibold text-[#FFB4AE]">{c.error}</p>
            ) : (
              <p className="mt-1 text-[19px] font-semibold text-call-muted">…</p>
            )}
            {c.alerts.map((a) => (
              <div key={a.id} className="mt-2.5 flex items-start gap-2.5 rounded-xl bg-red-soft px-3.5 py-3 text-[15px] font-semibold leading-[1.35] text-red">
                <AlertIcon size={18} className="mt-px flex-none" />
                <span>
                  {a.message.en}
                  <span className="mt-0.5 block font-medium">{a.message.es}</span>
                </span>
              </div>
            ))}
          </div>
        ))}
        {interim ? (
          <div className={`rounded-2xl px-4 py-3.5 opacity-80 ${next === "patient" ? "bg-call-card-2" : "bg-call-card"}`}>
            <p className="text-[13px] font-semibold text-call-muted">{next === "patient" ? "You" : "Doctor"}</p>
            <p className="mt-1 text-[17px]">{interim}</p>
          </div>
        ) : null}
      </div>

      <footer className="flex justify-center gap-14 pt-4">
        <button type="button" onClick={toggleMute} className="flex w-[120px] flex-col items-center gap-2 text-[14px] font-semibold text-call-ink">
          <span className="grid size-[72px] place-items-center rounded-full bg-call-control">
            {phase === "muted" ? <MicIcon size={28} /> : <MicOffIcon size={28} />}
          </span>
          {phase === "muted" ? "Resume" : "Pause"}
        </button>
        <button type="button" onClick={end} className="flex w-[120px] flex-col items-center gap-2 text-[14px] font-semibold text-call-ink">
          <span className="grid size-[72px] place-items-center rounded-full bg-end">
            <EndCallIcon size={32} />
          </span>
          End and get summary
        </button>
      </footer>
    </main>
  );
}
