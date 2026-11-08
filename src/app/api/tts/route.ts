import type { Lang } from "@/lib/contract";
import { speak } from "@/lib/elevenlabs";

// { text, lang } in, MP3 out. lang is the language the text is written in.
export async function POST(req: Request) {
  const { text, lang } = (await req.json()) as { text?: string; lang?: Lang };
  if (!text?.trim() || (lang !== "en" && lang !== "es")) {
    return Response.json({ error: "text and lang (en|es) are required" }, { status: 400 });
  }
  try {
    const audio = await speak(text.slice(0, 1000), lang);
    return new Response(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("/api/tts failed", err);
    return Response.json({ error: "Text-to-speech failed." }, { status: 502 });
  }
}
