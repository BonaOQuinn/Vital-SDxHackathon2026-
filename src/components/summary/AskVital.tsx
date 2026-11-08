"use client";

// Talk to Vital about the patient after the visit: speak or type a question,
// get a short answer in the report's language, with Source buttons.
// Voice uses the browser's speech recognition and speech for now; Chris's
// ElevenLabs voice loop replaces both.
import { useEffect, useRef, useState } from "react";
import { pick, speechLocale, type LangCode } from "@/lib/languages";
import { askVital, suggestedQuestions, type AgentAnswer } from "@/lib/ask-vital";
import { MicIcon } from "@/components/icons";
import { Claim } from "./Sources";
import { Sheet } from "./Sheet";

type Message = { id: number; question: string; answer?: AgentAnswer };

// Minimal typing for the browser speech recognition API.
interface Recognition {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type RecognitionCtor = new () => Recognition;

function getRecognition(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function AskVital({ lang }: { lang: LangCode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser feature check after mount
    setVoiceSupported(getRecognition() !== null);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q) return;
    const id = nextId.current++;
    setDraft("");
    setMessages((m) => [...m, { id, question: q }]);
    const answer = await askVital(q);
    setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, answer } : msg)));
    const text = pick(answer.text, lang);
    if (text && "speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = speechLocale(lang);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }
  }

  function toggleListening() {
    const Ctor = getRecognition();
    if (!Ctor) return;
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const r = new Ctor();
    r.lang = speechLocale(lang);
    r.interimResults = false;
    r.onresult = (e) => ask(e.results[0][0].transcript);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognition.current = r;
    setListening(true);
    r.start();
  }

  function close() {
    recognition.current?.stop();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setOpen(false);
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto max-w-[640px] px-5 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-14 w-full items-center justify-center gap-2.5 rounded-[14px] bg-blue text-[18px] font-semibold text-white active:bg-[#1849B0]"
          >
            <MicIcon size={22} />
            Ask Vital about this patient
          </button>
        </div>
      </div>

      <Sheet title="Ask Vital" open={open} onClose={close}>
        <p className="text-[15px] leading-[1.45] text-ink-2">
          Ask about anything said in the conversation or in the medical profile. Every answer shows its source.
        </p>

        <div className="mt-4 flex flex-col gap-3" aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className="flex flex-col gap-2">
              <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-blue px-4 py-2.5 text-[16px] leading-[1.45] text-white">{m.question}</p>
              {m.answer ? (
                <p className="mr-auto max-w-[92%] rounded-2xl rounded-bl-md bg-surface px-4 py-2.5 text-[16px] leading-[1.5]" lang={lang}>
                  <Claim statement={m.answer} />
                </p>
              ) : (
                <p className="mr-auto rounded-2xl bg-surface px-4 py-2.5 text-[16px] text-ink-2">Looking it up…</p>
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {messages.length === 0 ? (
          <div className="mt-2 flex flex-col gap-2">
            {(pick(suggestedQuestions, lang) ?? []).map((q) => (
              <button
                key={q}
                type="button"
                lang={lang}
                onClick={() => ask(q)}
                className="min-h-11 rounded-xl border border-line bg-surface px-4 py-2 text-left text-[16px] font-semibold text-blue"
              >
                {q}
              </button>
            ))}
          </div>
        ) : null}

        <form
          className="sticky bottom-0 mt-4 flex items-center gap-2 bg-bg pt-2 pb-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask(draft);
          }}
        >
          {voiceSupported ? (
            <button
              type="button"
              onClick={toggleListening}
              aria-pressed={listening}
              aria-label={listening ? "Stop listening" : "Ask by voice"}
              className={`grid size-12 flex-none place-items-center rounded-full text-white ${listening ? "bg-red" : "bg-blue"}`}
            >
              <MicIcon size={22} />
            </button>
          ) : null}
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={listening ? "Listening…" : "Type a question"}
            aria-label="Your question"
            className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 text-[17px] placeholder:text-ink-3 focus:border-blue focus:outline-none"
          />
          <button type="submit" disabled={!draft.trim()} className="h-12 flex-none rounded-xl px-3 text-[17px] font-semibold text-blue disabled:text-ink-3">
            Ask
          </button>
        </form>
      </Sheet>
    </>
  );
}
