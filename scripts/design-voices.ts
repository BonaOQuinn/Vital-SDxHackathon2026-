// Generates the two Vital voices with ElevenLabs Voice Design (no recordings)
// and prints the voice IDs to put in .env.local.
//   npm run voices:design
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error("ELEVENLABS_API_KEY is missing. Add it to .env.local.");
  process.exit(1);
}

const API = "https://api.elevenlabs.io/v1";
const voices = [
  {
    env: "ELEVENLABS_VOICE_ES",
    name: "Vital Patient (Spanish output)",
    description: "Calm, clear adult voice speaking neutral Spanish at a steady pace, warm and reassuring, studio quality.",
    text: "Me caí de un scooter eléctrico hace unos veinte minutos. Me duele mucho la muñeca derecha y tengo una cortada en el brazo.",
  },
  {
    env: "ELEVENLABS_VOICE_EN",
    name: "Vital Clinician (English output)",
    description: "Professional, calm adult voice speaking clear American English at a measured pace, like a kind emergency nurse.",
    text: "From zero to ten, how much does your wrist hurt? I am going to clean the wound and check your blood pressure now.",
  },
];

async function call(path: string, body: unknown) {
  const res = await fetch(`${API}${path}`, { method: "POST", headers: { "xi-api-key": key!, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

for (const v of voices) {
  const design = await call("/text-to-voice/design", { voice_description: v.description, text: v.text, model_id: "eleven_multilingual_ttv_v2" });
  const preview = design.previews?.[0];
  if (!preview) throw new Error(`No preview returned for ${v.name}`);
  const saved = await call("/text-to-voice", { voice_name: v.name, voice_description: v.description, generated_voice_id: preview.generated_voice_id });
  console.log(`${v.env}=${saved.voice_id}`);
}
