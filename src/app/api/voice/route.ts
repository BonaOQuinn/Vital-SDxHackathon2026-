import { cloneVoice, deleteVoice, isVoiceId } from "@/lib/elevenlabs";

export const maxDuration = 30;

// POST multipart { speaker: "patient" | "clinician" | "doctor", audio: File (1-10) } -> { voiceId }
// Creates a temporary Instant Voice Clone from what the speaker has said so far.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const speaker = form?.get("speaker");
  const samples = (form?.getAll("audio") ?? []).filter((f): f is File => f instanceof Blob && f.size > 0);
  if ((speaker !== "patient" && speaker !== "clinician" && speaker !== "doctor") || samples.length === 0) {
    return Response.json({ error: "speaker and audio are required" }, { status: 400 });
  }
  try {
    const voiceId = await cloneVoice(`Vital ${speaker} ${new Date().toISOString().slice(0, 16)}`, samples.slice(0, 10));
    return Response.json({ voiceId });
  } catch (e) {
    console.error("/api/voice clone failed", e);
    return Response.json({ error: "Voice cloning failed. Using the standard voice." }, { status: 502 });
  }
}

// DELETE /api/voice?id=<voiceId> -> removes the session clone from the ElevenLabs account.
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!isVoiceId(id)) return Response.json({ error: "Invalid voice id" }, { status: 400 });
  try {
    await deleteVoice(id);
    return Response.json({ deleted: true });
  } catch (e) {
    console.error("/api/voice delete failed", e);
    return Response.json({ error: "Delete failed" }, { status: 502 });
  }
}
