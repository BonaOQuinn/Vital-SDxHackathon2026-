import { demoAsrKeywords } from "@/data";
import { ElevenLabsError, transcribe } from "@/lib/elevenlabs";

// One recorded utterance (multipart field "audio") in, transcript + language out.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return Response.json({ error: "audio file is required" }, { status: 400 });
  }
  try {
    const t = await transcribe(audio, demoAsrKeywords);
    return Response.json(t);
  } catch (err) {
    console.error("/api/stt failed", err);
    const status = err instanceof ElevenLabsError && err.status === 401 ? 401 : 502;
    return Response.json({ error: "Speech-to-text failed." }, { status });
  }
}
