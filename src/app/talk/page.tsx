"use client";

// Live translation, hands-free. Matches the original mockup (mockups/app-screens.html, screen 2).
//
// Flow: listen for the patient (English) -> POST /api/turn -> show the translation,
// then say it in Spanish -> listen for the doctor (Spanish) -> translate to English
// -> say it -> back to the patient. The mic is off while the phone is speaking
// (half-duplex), so a shared phone never hears itself.
//
// Speech in/out uses ElevenLabs: the open mic (useVoiceLoop) hands each finished
// sentence to Scribe (/api/stt), which also detects English vs Spanish, so either
// person can speak at any time. Translations are spoken with ElevenLabs voices
// (/api/tts), falling back to the browser's voice if that fails.
//
// If the browser can't use the microphone, or the URL has ?demo=1, it plays the
// sample conversation instead so the demo never stalls.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertIcon, EndCallIcon, MicIcon, MicOffIcon } from "@/components/icons";
import { demoProfile, demoTurns, type Alert, type Speaker } from "@/data";
import type { TurnResponse } from "@/lib/contract";
import { loadProfile } from "@/lib/profile-store";
import { useVoiceLoop } from "@/lib/use-voice-loop";

type Phase = "starting" | "needs-tap" | "listening" | "translating" | "speaking" | "muted";
type Caption = { id: number; speaker: Speaker; original: string; translation?: string; alerts: Alert[]; error?: string };

const LANG: Record<Speaker, { stt: string; code: "en" | "es"; name: string }> = {
  patient: { stt: "en-US", code: "en", name: "English" },
  clinician: { stt: "es-MX", code: "es", name: "Español" },
};
const other = (s: Speaker): Speaker => (s === "patient" ? "clinician" : "patient");

// ---------- browser speech helpers ----------

/** Browser voice, used only when ElevenLabs text-to-speech fails. */
function browserSay(text: string, lang: string): Promise<void> {
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

const voiceLabel = (s: "copying" | "ready" | "best" | "failed" | undefined) =>
  s === "copying" ? "copying…" : s === "ready" ? "on ✓" : s === "best" ? "on ✓✓" : s === "failed" ? "couldn't copy" : "after first sentence";

// ---------- page ----------

export default function TalkPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("starting");
  const [next, setNext] = useState<Speaker>("patient");
  const [interim, setInterim] = useState("");
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [demo, setDemo] = useState(false);
  const [ownVoices, setOwnVoices] = useState<"off" | "asking" | "on">("off");
  const [voiceStatus, setVoiceStatus] = useState<Partial<Record<Speaker, "copying" | "ready" | "best" | "failed">>>({});

  const alive = useRef(true);
  const mutedRef = useRef(false);
  const nextRef = useRef<Speaker>("patient");
  const historyRef = useRef<{ speaker: Speaker; original: string }[]>([]);
  const sessionId = useRef<string>("");
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const setSpeaker = (s: Speaker) => {
    nextRef.current = s;
    setNext(s);
  };

  // ---- speech out: ElevenLabs voice, browser voice as fallback ----
  const playRef = useRef<(audio: Blob) => Promise<void>>(async () => {});
  const say = useCallback(async (text: string, code: "en" | "es", voiceId?: string) => {
    if (!text || !alive.current) return;
    try {
      const res = await fetch("/api/tts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, lang: code, voiceId }) });
      if (!res.ok) throw new Error(String(res.status));
      await playRef.current(await res.blob());
    } catch {
      await browserSay(text, LANG[code === "en" ? "patient" : "clinician"].stt);
    }
  }, []);

  // ---- own voices (only when both people agree) ----
  // Each person's translations are spoken in a copy of their voice (ElevenLabs Instant
  // Voice Cloning). The copy is made from their first sentence so it works right away,
  // then remade once ~20 s of their speech is collected, which sounds much closer.
  // All copies are deleted from the ElevenLabs account when the conversation ends.
  const ownVoicesRef = useRef(false);
  const samplesRef = useRef<Record<Speaker, { blobs: Blob[]; secs: number }>>({ patient: { blobs: [], secs: 0 }, clinician: { blobs: [], secs: 0 } });
  const voiceIdRef = useRef<Partial<Record<Speaker, string>>>({});
  const cloningRef = useRef<Partial<Record<Speaker, Promise<string | null>>>>({});
  const upgradedRef = useRef<Partial<Record<Speaker, boolean>>>({});
  const allVoiceIds = useRef<string[]>([]);
  /** Set when ElevenLabs refuses a copy (e.g. the API key lacks voices_write): stop retrying. */
  const cloneFailedRef = useRef(false);

  const deleteVoice = (id: string) => fetch(`/api/voice?id=${id}`, { method: "DELETE", keepalive: true }).catch(() => {});
  const deleteAllVoices = useCallback(() => {
    allVoiceIds.current.forEach(deleteVoice);
    allVoiceIds.current = [];
    voiceIdRef.current = {};
    cloningRef.current = {};
  }, []);

  const cloneFrom = useCallback((speaker: Speaker, blobs: Blob[]) => {
    const form = new FormData();
    form.append("speaker", speaker);
    blobs.slice(-10).forEach((b, i) => form.append("audio", b, `${speaker}-${i}.wav`));
    const job = fetch("/api/voice", { method: "POST", body: form })
      .then((r) => (r.ok ? (r.json() as Promise<{ voiceId: string }>) : Promise.reject(new Error(String(r.status)))))
      .then(({ voiceId }) => {
        allVoiceIds.current.push(voiceId);
        const old = voiceIdRef.current[speaker];
        voiceIdRef.current[speaker] = voiceId;
        if (old) {
          deleteVoice(old);
          allVoiceIds.current = allVoiceIds.current.filter((v) => v !== old);
        }
        setVoiceStatus((v) => ({ ...v, [speaker]: upgradedRef.current[speaker] ? "best" : "ready" }));
        return voiceId;
      })
      .catch(() => {
        cloneFailedRef.current = true;
        setVoiceStatus((v) => ({ ...v, [speaker]: "failed" }));
        return null;
      })
      .finally(() => {
        if (cloningRef.current[speaker] === job) delete cloningRef.current[speaker];
      });
    cloningRef.current[speaker] = job;
  }, []);

  /** Keep the speaker's sample and (re)clone when it helps. WAV is 16 kHz 16-bit mono: 32 000 bytes per second. */
  const collectSample = useCallback(
    (speaker: Speaker, audio: Blob) => {
      if (!ownVoicesRef.current || cloneFailedRef.current) return;
      const s = samplesRef.current[speaker];
      s.blobs.push(audio);
      s.secs += Math.max(0, audio.size - 44) / 32000;
      if (cloningRef.current[speaker]) return;
      if (!voiceIdRef.current[speaker]) {
        setVoiceStatus((v) => ({ ...v, [speaker]: "copying" }));
        cloneFrom(speaker, s.blobs);
      } else if (!upgradedRef.current[speaker] && s.secs >= 20) {
        upgradedRef.current[speaker] = true;
        cloneFrom(speaker, s.blobs);
      }
    },
    [cloneFrom],
  );

  /** The speaker's voice copy, waiting a few seconds for the first one if it is still being made. */
  const voiceFor = useCallback(async (speaker: Speaker) => {
    if (!ownVoicesRef.current) return undefined;
    const ready = voiceIdRef.current[speaker];
    if (ready) return ready;
    const pending = cloningRef.current[speaker];
    if (!pending) return undefined;
    return (await Promise.race([pending, wait(8000).then(() => null)])) ?? undefined;
  }, []);

  useEffect(() => {
    window.addEventListener("pagehide", deleteAllVoices);
    return () => {
      window.removeEventListener("pagehide", deleteAllVoices);
      deleteAllVoices();
    };
  }, [deleteAllVoices]);

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
    const out = LANG[other(speaker)].code;
    await say(turn.translation, out, await voiceFor(speaker));
    for (const a of turn.alerts) await say(speaker === "patient" ? a.message.es : a.message.en, out);
    return true;
  }, [say, voiceFor]);

  // ---- speech in: open mic -> Scribe (detects English or Spanish) -> translate -> speak ----
  const voice = useVoiceLoop({
    onUtterance: async (audio) => {
      if (!alive.current || mutedRef.current) return;
      setInterim("");
      setPhase("translating");
      let text = "";
      let lang: string | null = null;
      try {
        const form = new FormData();
        form.append("audio", audio, "utterance.wav");
        const r = await fetch("/api/stt", { method: "POST", body: form });
        if (r.ok) ({ text, lang } = (await r.json()) as { text: string; lang: string | null });
      } catch {
        /* treated as silence */
      }
      if (!alive.current) return;
      if (text.replace(/[^\p{L}\p{N}]/gu, "").length > 1) {
        // Scribe says which language it heard, so either person can talk at any time.
        const speaker: Speaker = lang === "es" ? "clinician" : lang === "en" ? "patient" : nextRef.current;
        setSpeaker(speaker);
        if (lang === "en" || lang === "es") collectSample(speaker, audio);
        const ok = await runTurn(speaker, text.trim());
        if (ok && alive.current) setSpeaker(other(speaker));
      }
      if (alive.current && !mutedRef.current) setPhase("listening");
    },
  });
  useEffect(() => {
    playRef.current = voice.play;
  }, [voice.play]);

  const listen = useCallback(async () => {
    if (!alive.current || mutedRef.current) return;
    const ok = await voice.start();
    if (alive.current) setPhase(ok ? "listening" : "needs-tap");
  }, [voice]);

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
      await say(t.translation, LANG[other(t.speaker)].code);
      await wait(500);
    }
    if (alive.current) setPhase("muted");
  }, [say]);

  const start = useCallback(() => {
    // Unlock audio on iOS: speech output must start inside a tap.
    if (typeof speechSynthesis !== "undefined") speechSynthesis.speak(new SpeechSynthesisUtterance(""));
    const wantsDemo = new URLSearchParams(window.location.search).has("demo") || !navigator.mediaDevices?.getUserMedia;
    setDemo(wantsDemo);
    if (wantsDemo) void playDemo();
    else void listen();
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
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    };
    // Boot once; the open mic is released by useVoiceLoop on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Full-bleed dark background while this screen is open; put the page color back on leave.
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = "var(--color-call)";
    return () => {
      document.body.style.background = prev;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [captions, interim]);

  function toggleMute() {
    if (mutedRef.current) {
      mutedRef.current = false;
      if (demo) setPhase("listening");
      else void listen();
    } else {
      mutedRef.current = true;
      voice.stop();
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
      setInterim("");
      setPhase("muted");
    }
  }

  function flipSpeaker() {
    if (demo) return;
    // Language is detected automatically; this only changes who the status line expects next.
    setSpeaker(other(nextRef.current));
  }

  function end() {
    alive.current = false;
    voice.stop();
    deleteAllVoices();
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    router.push("/s/demo");
  }

  const who = next === "patient" ? "you" : "the doctor";
  const status: Record<Phase, string> = {
    starting: "Starting…",
    "needs-tap": "Tap the circle to start",
    listening: voice.state === "hearing" ? `Hearing ${who}…` : "Listening · English or Español",
    translating: "Translating…",
    speaking: next === "patient" ? "Speaking to the doctor in Spanish" : "Speaking to you in English",
    muted: "Paused",
  };
  const active = phase === "listening" || phase === "speaking";
  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <main className="mx-auto flex h-dvh w-full max-w-[480px] flex-col bg-call text-white pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),16px)]">

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
        {!demo && (
          <div className="mt-2 text-[13px]">
            {ownVoices === "off" && (
              <button type="button" onClick={() => setOwnVoices("asking")} className="rounded-full bg-call-control px-3.5 py-1.5 font-semibold text-call-ink">
                Speak in our own voices
              </button>
            )}
            {ownVoices === "asking" && (
              <div className="mx-auto max-w-[340px] rounded-2xl bg-call-card px-4 py-3 text-left text-call-ink">
                <p className="font-semibold">Copy both of your voices?</p>
                <p className="mt-1 text-call-muted">
                  Vital copies each person&apos;s voice from what they say, so the translation sounds like them. Both of you must agree. The copies are deleted when you end.
                </p>
                <div className="mt-2.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      ownVoicesRef.current = true;
                      setOwnVoices("on");
                    }}
                    className="rounded-full bg-blue px-3.5 py-1.5 font-semibold text-white"
                  >
                    We both agree
                  </button>
                  <button type="button" onClick={() => setOwnVoices("off")} className="rounded-full bg-call-control px-3.5 py-1.5 font-semibold">
                    Not now
                  </button>
                </div>
              </div>
            )}
            {ownVoices === "on" && (
              <p className="text-call-muted">
                Own voices · you: {voiceLabel(voiceStatus.patient)} · doctor: {voiceLabel(voiceStatus.clinician)}
              </p>
            )}
          </div>
        )}
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
        {voice.error ? <p className="mx-6 mt-2 text-center text-[14px] leading-snug text-[#FFB4AE]">{voice.error}</p> : null}
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
        {!interim && voice.state === "hearing" && phase === "listening" ? (
          <div className="rounded-2xl bg-call-card-2 px-4 py-3.5 opacity-80">
            <p className="text-[17px] text-call-muted">…</p>
          </div>
        ) : null}
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
