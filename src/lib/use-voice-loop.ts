"use client";

// Open-mic loop for one shared phone. Listens continuously, starts recording
// when someone speaks, and hands over the utterance once they pause.
// While Vital is translating or speaking, the mic is ignored (half-duplex),
// so the phone does not translate its own voice.
import { useCallback, useEffect, useRef, useState } from "react";

export type MicState = "off" | "starting" | "listening" | "hearing" | "paused" | "denied" | "unavailable";

/** Live detector numbers, shown with ?debug=1. */
export interface MicStats {
  rms: number;
  floor: number;
  threshold: number;
}

interface Options {
  /** Called with one finished utterance. Resolve when Vital is ready to listen again. */
  onUtterance: (audio: Blob) => Promise<void>;
  /** Silence that ends an utterance. */
  silenceMs?: number;
}

const MIN_SPEECH_MS = 300;
/** Frames (50 ms each) above the threshold before recording starts, so clicks do not count. */
const ONSET_FRAMES = 2;
const MAX_UTTERANCE_MS = 20_000;

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"].find((m) => MediaRecorder.isTypeSupported(m));
}

export function useVoiceLoop({ onUtterance, silenceMs = 900 }: Options) {
  const [state, setState] = useState<MicState>("off");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<MicStats>({ rms: 0, floor: 0, threshold: 0 });

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const busyRef = useRef(false);
  /** Set while the hold-to-talk button is pressed: record regardless of the detector. */
  const manualRef = useRef(false);
  const beginRef = useRef<(() => void) | null>(null);
  const finishRef = useRef<((keep: boolean) => void) | null>(null);
  const handlerRef = useRef(onUtterance);
  useEffect(() => {
    handlerRef.current = onUtterance;
  });

  const stop = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    busyRef.current = false;
    setLevel(0);
    setState("off");
  }, []);

  useEffect(() => stop, [stop]);

  const ensureCtx = useCallback(() => {
    const ctx = (ctxRef.current ??= new AudioContext());
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }, []);

  /** Must be called from a tap: iOS only allows mic and audio after a user gesture. */
  const start = useCallback(async (intro?: () => Promise<void>) => {
    setError(null);
    setState("starting");

    // Create the audio context inside the tap so iOS allows playback later.
    const ctx = ensureCtx();

    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unavailable");
      setError("This browser cannot use the microphone here. Open Vital over HTTPS (or localhost), or type your message below.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (e) {
      const name = (e as DOMException)?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setState("denied");
        setError("Microphone permission was denied. Allow microphone access in your browser settings and tap Start again, or type your message below.");
      } else {
        setState("unavailable");
        setError("No microphone was found. Connect one and tap Start again, or type your message below.");
      }
      return;
    }
    streamRef.current = stream;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    // Safari only processes nodes that reach the destination: route through a muted gain.
    const mute = ctx.createGain();
    mute.gain.value = 0;
    analyser.connect(mute).connect(ctx.destination);
    const buf = new Float32Array(analyser.fftSize);
    const mime = pickMime();

    // Noise floor: average of the first half second, then a slow moving average of
    // the frames where nobody is speaking. Speech must rise clearly above it.
    let floor = 0;
    let calibrating = 10;
    let above = 0;
    let speechStart = 0;
    let lastVoice = 0;
    let chunks: Blob[] = [];

    const finish = (keep: boolean) => {
      const rec = recorderRef.current;
      recorderRef.current = null;
      if (!rec || rec.state !== "recording") return;
      rec.onstop = async () => {
        const blob = new Blob(chunks, { type: rec.mimeType || mime || "audio/webm" });
        chunks = [];
        if (!keep || blob.size < 2000) {
          setState("listening");
          return;
        }
        busyRef.current = true;
        setState("paused");
        try {
          await handlerRef.current(blob);
        } finally {
          busyRef.current = false;
          if (streamRef.current) setState("listening");
        }
      };
      rec.stop();
    };

    const begin = () => {
      if (recorderRef.current) return;
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      rec.ondataavailable = (ev) => ev.data.size > 0 && chunks.push(ev.data);
      rec.start(250);
      recorderRef.current = rec;
      speechStart = performance.now();
      lastVoice = speechStart;
      setState("hearing");
    };
    beginRef.current = begin;
    finishRef.current = finish;

    timerRef.current = window.setInterval(() => {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += v * v;
      const rms = Math.sqrt(sum / buf.length);
      // Perceptual scale for the meter: quiet speech (~0.01) already moves it.
      setLevel(Math.min(1, Math.sqrt(rms) * 3));

      if (calibrating > 0) {
        floor += rms / 10;
        calibrating--;
        return;
      }
      const threshold = Math.min(0.06, Math.max(0.008, floor * 3));
      setStats({ rms, floor, threshold });
      if (busyRef.current || manualRef.current) return;

      const now = performance.now();
      const voiced = rms > threshold;
      if (!recorderRef.current) floor = floor * 0.95 + Math.min(rms, threshold) * 0.05;

      above = voiced ? above + 1 : 0;
      if (voiced) lastVoice = now;
      if (!recorderRef.current && above >= ONSET_FRAMES) {
        begin();
      } else if (recorderRef.current) {
        const long = now - speechStart > MAX_UTTERANCE_MS;
        if (now - lastVoice > silenceMs || long) finish(now - speechStart - (long ? 0 : silenceMs) > MIN_SPEECH_MS);
      }
    }, 50);

    // Anything spoken first is ignored by the mic, like every other Vital reply.
    if (intro) {
      busyRef.current = true;
      setState("paused");
      try {
        await intro();
      } finally {
        busyRef.current = false;
      }
    }
    setState("listening");
  }, [silenceMs, ensureCtx]);

  /** Hold-to-talk: press starts recording, release sends it. Works when the room is too noisy for auto-detect. */
  const holdStart = useCallback(() => {
    if (!streamRef.current || busyRef.current) return;
    manualRef.current = true;
    beginRef.current?.();
  }, []);
  const holdEnd = useCallback(() => {
    if (!manualRef.current) return;
    manualRef.current = false;
    finishRef.current?.(true);
  }, []);

  /** Plays translated speech through the tap-unlocked audio context. Resolves when done. */
  const play = useCallback(
    async (audio: Blob) => {
      const ctx = ensureCtx();
      try {
        const buffer = await ctx.decodeAudioData(await audio.arrayBuffer());
        await new Promise<void>((resolve) => {
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          src.connect(ctx.destination);
          src.onended = () => resolve();
          src.start();
        });
      } catch {
        // Undecodable audio: skip playback, the text is already on screen.
      }
    },
    [ensureCtx],
  );

  return { state, level, error, stats, start, stop, play, holdStart, holdEnd };
}
