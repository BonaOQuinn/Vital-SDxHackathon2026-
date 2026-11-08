import type { Lang } from "@/lib/contract";
import { isVoiceId, speak } from "@/lib/elevenlabs";

// { text, lang, voiceId? } in, MP3 out. lang is the language the text is written in;
// voiceId is the speaker's session clone, when they agreed to one.
export async function POST(req: Request) {
  const { text, lang, voiceId } = (await req.json()) as { text?: string; lang?: Lang; voiceId?: unknown };
  if (!text?.trim() || (lang !== "en" && lang !== "es")) {
    return Response.json({ error: "text and lang (en|es) are required" }, { status: 400 });
  }
  try {
    const audio = await speak(text.slice(0, 1000), lang, isVoiceId(voiceId) ? voiceId : undefined);
    return new Response(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("/api/tts failed", err);
    return Response.json({ error: "Text-to-speech failed." }, { status: 502 });
  }
}
