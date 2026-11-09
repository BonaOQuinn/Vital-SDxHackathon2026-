// Server-only ElevenLabs calls. Never import this from client components:
// it reads ELEVENLABS_API_KEY.
import { env } from "@/lib/env";
import type { Lang } from "@/lib/contract";

const API = "https://api.elevenlabs.io/v1";

export class ElevenLabsError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** Scribe returns ISO 639-3 ("eng", "spa") or 639-1 ("en", "es"). */
export function toLang(code: string | undefined | null): Lang | null {
  if (!code) return null;
  const c = code.toLowerCase();
  if (c === "en" || c === "eng" || c.startsWith("en-")) return "en";
  if (c === "es" || c === "spa" || c.startsWith("es-")) return "es";
  return null;
}

export interface Transcription {
  text: string;
  /** Raw language code from Scribe. */
  languageCode: string | null;
  lang: Lang | null;
  languageProbability: number | null;
}

/**
 * Batch speech-to-text with Scribe. The browser records one utterance (it
 * waits for the speaker to pause), then posts it here.
 */
export async function transcribe(audio: Blob, keyterms: string[] = []): Promise<Transcription> {
  const models = [env.sttModel, "scribe_v1"].filter((m, i, a) => a.indexOf(m) === i);
  let lastError: ElevenLabsError | null = null;

  for (const model of models) {
    const form = new FormData();
    form.append("model_id", model);
    form.append("file", audio, "utterance");
    form.append("tag_audio_events", "false");
    // Keyterms help Scribe spell drug names. Ignored by models that do not support them.
    for (const term of keyterms.slice(0, 50)) form.append("keyterms", term);

    const res = await fetch(`${API}/speech-to-text`, {
      method: "POST",
      headers: { "xi-api-key": env.elevenLabsKey },
      body: form,
    });
    if (res.ok) {
      const data = (await res.json()) as { text?: string; language_code?: string; language_probability?: number };
      return {
        text: (data.text ?? "").trim(),
        languageCode: data.language_code ?? null,
        lang: toLang(data.language_code),
        languageProbability: data.language_probability ?? null,
      };
    }
    lastError = new ElevenLabsError(`Scribe ${model} failed: ${res.status} ${await res.text()}`, res.status);
    // Only fall back to the older model on a request error (unknown model, bad param).
    if (res.status !== 400 && res.status !== 422) break;
  }
  throw lastError ?? new ElevenLabsError("Scribe failed", 500);
}

/** One generated multilingual voice per language, so the listener knows who is talking. */
function voiceFor(lang: Lang): string {
  return lang === "es" ? env.voiceEs : env.voiceEn;
}

/** ElevenLabs voice ids are short alphanumeric strings. */
export const isVoiceId = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9]{10,40}$/.test(v);

/**
 * Text-to-speech. Returns MP3 bytes. With `voiceId` (a session clone) the
 * translation is spoken in the speaker's own voice; otherwise the stock voice
 * for the language.
 */
export async function speak(text: string, lang: Lang, voiceId?: string): Promise<ArrayBuffer> {
  // A cloned voice uses the multilingual model, which keeps the speaker's timbre
  // best across languages, with similarity turned up. Stock voices use the fast model.
  const body = voiceId
    ? {
        text,
        model_id: env.cloneTtsModel,
        voice_settings: { stability: 0.45, similarity_boost: 0.9, style: 0, use_speaker_boost: true },
      }
    : {
        text,
        model_id: env.ttsModel,
        language_code: lang,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      };
  const res = await fetch(`${API}/text-to-speech/${voiceId ?? voiceFor(lang)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": env.elevenLabsKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ElevenLabsError(`TTS failed: ${res.status} ${await res.text()}`, res.status);
  return res.arrayBuffer();
}

/**
 * Instant Voice Cloning from the speaker's own recorded utterances. Only with
 * the speaker's consent; the clone is deleted when the session ends.
 */
export async function cloneVoice(name: string, samples: Blob[]): Promise<string> {
  const form = new FormData();
  form.append("name", name);
  form.append("description", "Temporary Vital session voice. Deleted when the session ends.");
  form.append("remove_background_noise", "true");
  samples.forEach((b, i) => form.append("files", b, `sample-${i}.wav`));
  const res = await fetch(`${API}/voices/add`, { method: "POST", headers: { "xi-api-key": env.elevenLabsKey }, body: form });
  if (!res.ok) throw new ElevenLabsError(`Voice clone failed: ${res.status} ${await res.text()}`, res.status);
  const data = (await res.json()) as { voice_id: string };
  return data.voice_id;
}

export async function deleteVoice(voiceId: string): Promise<void> {
  const res = await fetch(`${API}/voices/${voiceId}`, { method: "DELETE", headers: { "xi-api-key": env.elevenLabsKey } });
  if (!res.ok && res.status !== 404) throw new ElevenLabsError(`Voice delete failed: ${res.status} ${await res.text()}`, res.status);
}
