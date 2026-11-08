"use client";

// Step 1 after an injury: the patient talks to Vital, which asks short questions
// and builds the report before they reach care.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { demoLocation } from "@/data";
import { ChevronLeftIcon, MicIcon } from "@/components/icons";
import type { Note } from "@/lib/contract";
import { emergencyNumber } from "@/lib/emergency";
import type { IntakeExchange } from "@/lib/intake";
import { loadProfile } from "@/lib/profile-store";
import type { ReviewedWarning, SessionTurn } from "@/lib/report";
import { mergeAlerts } from "@/lib/safety-checks";
import { saveSession, type StoredSession } from "@/lib/session-store";
import { blankProfile } from "@/lib/sharing";
import { useVoiceLoop } from "@/lib/use-voice-loop";

const OPENING = "I'm Vital. I'll write this down so medical staff can help you faster. Tell me what happened.";
const emergency = emergencyNumber(demoLocation.country);

type Message = { from: "vital" | "you"; text: string };
type IntakeReply = {
  reply: string;
  done: boolean;
  source_lang: "en" | "es";
  translation: string;
  alerts: ReviewedWarning[];
  notes: Note[];
  persisted: boolean;
};

function newSession(): StoredSession {
  return { sessionId: crypto.randomUUID(), startedAt: new Date().toISOString(), turns: [], notes: [], warnings: [], stage: "intake" };
}

export default function IntakePage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([{ from: "vital", text: OPENING }]);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const session = useRef<StoredSession | null>(null);
  const history = useRef<IntakeExchange[]>([]);
  const asked = useRef(OPENING);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function speak(text: string, play: (b: Blob) => Promise<void>) {
    const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang: "en" }) }).catch(() => null);
    if (res?.ok) await play(await res.blob());
  }

  async function answer(text: string, play: (b: Blob) => Promise<void>) {
    session.current ??= newSession();
    const current = session.current;
    setBusy(true);
    setFailure(null);
    setMessages((m) => [...m, { from: "you", text }]);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: current.sessionId, transcript: text, asked: asked.current, profile: loadProfile() ?? blankProfile, history: history.current }),
      });
      if (!res.ok) {
        setFailure("Vital couldn't process that. Please say it again, or type it below. If this is urgent, call now.");
        return;
      }
      const out = (await res.json()) as IntakeReply;
      history.current = [...history.current, { asked: asked.current, answer: text }];
      asked.current = out.reply;

      const turn: SessionTurn = { speaker: "patient", source_lang: out.source_lang, original: text, translation: out.translation, at: new Date().toISOString() };
      session.current = {
        ...current,
        turns: [...current.turns, turn],
        notes: [...current.notes, ...out.notes],
        warnings: mergeAlerts(current.warnings, out.alerts),
        stage: out.done ? "intake_done" : "intake",
      };
      saveSession(session.current);
      setMessages((m) => [...m, { from: "vital", text: out.reply }]);
      await speak(out.reply, play);

      if (out.done) {
        voice.stop();
        router.push("/care");
      }
    } catch {
      setFailure("Network error. Please try again, or call now if this is urgent.");
    } finally {
      setBusy(false);
    }
  }

  const voice = useVoiceLoop({
    onUtterance: async (audio) => {
      const form = new FormData();
      form.append("audio", audio, "utterance");
      const res = await fetch("/api/stt", { method: "POST", body: form }).catch(() => null);
      if (!res?.ok) {
        setFailure("Vital couldn't hear that. Please say it again, or type it below.");
        return;
      }
      const stt = (await res.json()) as { text: string };
      if (stt.text && stt.text.replace(/[^\p{L}\p{N}]/gu, "").length > 1) await answer(stt.text, voice.play);
    },
  });

  function sendTyped(e: React.FormEvent) {
    e.preventDefault();
    const text = typed.trim();
    if (!text || busy) return;
    setTyped("");
    void answer(text, voice.play);
  }

  const live = voice.state === "listening" || voice.state === "hearing" || voice.state === "paused";

  return (
    <main className="mx-auto flex h-dvh w-full max-w-[480px] flex-col bg-call text-call-ink">
      <header className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <Link href="/" className="-ml-2 flex h-11 items-center gap-1 px-2 text-[17px] text-call-muted">
          <ChevronLeftIcon />
          Home
        </Link>
        <a href={`tel:${emergency.number}`} className="rounded-full bg-end px-4 py-2 text-[15px] font-semibold text-white">
          Call {emergency.number}
        </a>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
        {messages.map((m, i) => (
          <p key={i} className={`rounded-card p-3 text-[18px] leading-snug ${m.from === "vital" ? "bg-call-card font-medium" : "ml-8 bg-call-card-2"}`}>
            {m.text}
          </p>
        ))}
        {busy ? <p className="px-1 text-[15px] text-call-muted">Vital is writing this down…</p> : null}
      </div>

      {voice.error || failure ? (
        <p role="alert" className="mx-4 mb-2 rounded-card bg-red-soft p-3 text-[14px] text-red">
          {voice.error ?? failure}
        </p>
      ) : null}

      <form onSubmit={sendTyped} className="flex gap-2 px-4 pb-2">
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Type instead"
          aria-label="Type what happened"
          className="min-w-0 flex-1 rounded-xl bg-call-control px-3 py-2.5 text-[16px] text-call-ink placeholder:text-call-muted"
        />
        <button type="submit" disabled={!typed.trim() || busy} className="rounded-xl bg-call-card-2 px-3 text-[15px] font-semibold disabled:opacity-40">
          Send
        </button>
      </form>

      <footer className="px-4 pt-2 pb-[max(env(safe-area-inset-bottom),16px)]">
        {live ? (
          <button onClick={voice.stop} className="flex h-14 w-full items-center justify-center rounded-2xl bg-call-control text-[17px] font-semibold">
            Pause
          </button>
        ) : (
          <button
            onClick={() => voice.start(() => speak(asked.current, voice.play))}
            disabled={voice.state === "starting"}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue text-[17px] font-semibold text-white"
          >
            <MicIcon size={22} />
            {messages.length > 1 ? "Resume talking" : "Start talking"}
          </button>
        )}
        <p className="mt-2 text-center text-[11px] leading-snug text-call-muted">Vital writes down what you say. It does not diagnose and does not replace emergency services.</p>
      </footer>
    </main>
  );
}
