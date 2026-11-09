"use client";

// Open-mic loop for one shared phone. Listens continuously, starts capturing
// when someone speaks, and hands over the utterance once they pause.
// While Vital is translating or speaking, the mic is ignored (half-duplex),
// so the phone does not translate its own voice.
//
// Audio is captured as raw PCM from the Web Audio graph and encoded to WAV in
// code. No MediaRecorder: it fails to start on some browsers and devices
// ("NotSupportedError ... error starting the MediaRecorder"), and it clips the
// first syllable. A short pre-roll buffer keeps the start of each sentence.
import { useCallback, useEffect, useRef, useState } from "react";

export type MicState = "off" | "starting" | "listening" | "hearing" | "paused" | "denied" | "unavailable";

/** Live detector numbers, shown with ?debug=1. */
export interface MicStats {
  rms: number;
  floor: number;
  threshold: number;
}

interface Options {
  /** Called with one finished utterance (WAV). Resolve when Vital is ready to listen again. */
  onUtterance: (audio: Blob) => Promise<void>;
  /** Silence that ends an utterance. */
  silenceMs?: number;
}

const MIN_SPEECH_MS = 300;
const MAX_UTTERANCE_MS = 20_000;
/** Consecutive voiced frames before capture starts, so clicks do not count. */
const ONSET_FRAMES = 2;
/** Audio kept from before the onset, so the first syllable is not lost. */
const PREROLL_MS = 400;
const OUT_RATE = 16_000;

/** Mono Float32 chunks at `rate` -> 16 kHz 16-bit PCM WAV. */
export function encodeWav(chunks: Float32Array[], rate: number): Blob {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const ratio = rate / OUT_RATE;
  const outLen = Math.floor(total / ratio);
  const pcm = new Int16Array(outLen);
  // Average-downsample (a simple low-pass) from the context rate to 16 kHz.
  let ci = 0;
  let off = 0;
  const read = () => {
    while (ci < chunks.length && off >= chunks[ci].length) {
      ci++;
      off = 0;
    }
    return ci < chunks.length ? chunks[ci][off++] : 0;
  };
  for (let i = 0; i < outLen; i++) {
    const n = Math.floor((i + 1) * ratio) - Math.floor(i * ratio) || 1;
    let sum = 0;
    for (let k = 0; k < n; k++) sum += read();
    pcm[i] = Math.max(-32768, Math.min(32767, Math.round((sum / n) * 32767)));
  }
  const buf = new ArrayBuffer(44 + pcm.byteLength);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + pcm.byteLength, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, OUT_RATE, true);
  v.setUint32(28, OUT_RATE * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, pcm.byteLength, true);
  new Int16Array(buf, 44).set(pcm);
  return new Blob([buf], { type: "audio/wav" });
}

export function useVoiceLoop({ onUtterance, silenceMs = 900 }: Options) {
  const [state, setState] = useState<MicState>("off");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<MicStats>({ rms: 0, floor: 0, threshold: 0 });

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);
  const busyRef = useRef(false);
  /** Set while the hold-to-talk button is pressed: capture regardless of the detector. */
  const manualRef = useRef(false);
  const beginRef = useRef<(() => void) | null>(null);
  const finishRef = useRef<((keep: boolean) => void) | null>(null);
  const handlerRef = useRef(onUtterance);
  useEffect(() => {
    handlerRef.current = onUtterance;
  });

  const stop = useCallback(() => {
    nodesRef.current.forEach((n) => n.disconnect());
    nodesRef.current = [];
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    busyRef.current = false;
    manualRef.current = false;
    beginRef.current = null;
    finishRef.current = null;
    setLevel(0);
    setState("off");
  }, []);

  useEffect(
    () => () => {
      stop();
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    },
    [stop],
  );

  const ensureCtx = useCallback(() => {
    const ctx = (ctxRef.current ??= new AudioContext());
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }, []);

  /**
   * Call from a tap when possible: browsers only allow mic audio and playback after a
   * user gesture. Resolves false when the browser still needs a tap to start audio.
   * `intro` is spoken first, with the mic ignored while it plays.
   */
  const start = useCallback(async (intro?: () => Promise<void>): Promise<boolean> => {
    setError(null);
    setState("starting");

    // Create (or resume) the audio context inside the tap so iOS allows playback later.
    const ctx = ensureCtx();

    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unavailable");
      setError("This browser cannot use the microphone here. Open Vital over HTTPS (or localhost), or type your message below.");
      return false;
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
      return false;
    }
    streamRef.current = stream;
    if (ctx.state === "suspended") await ctx.resume().catch(() => {});
    if (ctx.state !== "running") {
      // Autoplay policy: no audio until the user taps. Release the mic and ask for a tap.
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setState("off");
      return false;
    }

    const source = ctx.createMediaStreamSource(stream);
    // ScriptProcessor is deprecated but works everywhere without a separate worklet file.
    const proc = ctx.createScriptProcessor(2048, 1, 1);
    // Safari only processes nodes that reach the destination: route through a muted gain.
    const mute = ctx.createGain();
    mute.gain.value = 0;
    source.connect(proc);
    proc.connect(mute).connect(ctx.destination);
    nodesRef.current = [source, proc, mute];

    const rate = ctx.sampleRate;
    const frameMs = (2048 / rate) * 1000;
    const prerollFrames = Math.ceil(PREROLL_MS / frameMs);

    // Noise floor: average of the first half second, then a slow moving average of
    // the frames where nobody is speaking. Speech must rise clearly above it.
    const calibrationFrames = Math.ceil(500 / frameMs);
    let calibrating = calibrationFrames;
    let floor = 0;
    let above = 0;
    let capturing = false;
    let speechStart = 0;
    let lastVoice = 0;
    let captured: Float32Array[] = [];
    const preroll: Float32Array[] = [];

    const begin = () => {
      if (capturing) return;
      capturing = true;
      captured = [...preroll];
      speechStart = performance.now();
      lastVoice = speechStart;
      setState("hearing");
    };

    const finish = (keep: boolean) => {
      if (!capturing) return;
      capturing = false;
      const chunks = captured;
      captured = [];
      if (!keep || chunks.length * frameMs < MIN_SPEECH_MS + PREROLL_MS) {
        setState("listening");
        return;
      }
      busyRef.current = true;
      setState("paused");
      handlerRef.current(encodeWav(chunks, rate)).finally(() => {
        busyRef.current = false;
        preroll.length = 0;
        if (streamRef.current) setState("listening");
      });
    };
    beginRef.current = begin;
    finishRef.current = finish;

    proc.onaudioprocess = (ev) => {
      const frame = new Float32Array(ev.inputBuffer.getChannelData(0)); // copy: the buffer is reused
      let sum = 0;
      for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
      const rms = Math.sqrt(sum / frame.length);
      // Perceptual scale for the meter: quiet speech (~0.01) already moves it.
      setLevel(Math.min(1, Math.sqrt(rms) * 3));

      if (calibrating > 0) {
        floor += rms / calibrationFrames;
        calibrating--;
        return;
      }
      const threshold = Math.min(0.06, Math.max(0.008, floor * 3));
      setStats({ rms, floor, threshold });

      if (busyRef.current) return;
      if (capturing) captured.push(frame);
      else {
        preroll.push(frame);
        if (preroll.length > prerollFrames) preroll.shift();
      }
      if (manualRef.current) return;

      const now = performance.now();
      const voiced = rms > threshold;
      if (!capturing) floor = floor * 0.95 + Math.min(rms, threshold) * 0.05;

      above = voiced ? above + 1 : 0;
      if (voiced) lastVoice = now;
      if (!capturing && above >= ONSET_FRAMES) begin();
      else if (capturing) {
        const long = now - speechStart > MAX_UTTERANCE_MS;
        if (now - lastVoice > silenceMs || long) finish(true);
      }
    };

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
    return true;
  }, [silenceMs, ensureCtx]);

  /** Hold-to-talk: press starts capture, release sends it. Works when the room is too noisy for auto-detect. */
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
