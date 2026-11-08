// End-to-end backend checks against a running Vital server.
//   npm run smoke                         (http://localhost:3000)
//   BASE_URL=https://... npm run smoke    (e.g. a Daytona preview URL)
// ElevenLabs checks run only when the server reports a key; Claude checks
// only when it reports an Anthropic key. Fictional data only.
import { demoProfile } from "../src/data/demo-profile";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const headers: Record<string, string> = { "Content-Type": "application/json" };
if (process.env.DAYTONA_PREVIEW_TOKEN) headers["x-daytona-preview-token"] = process.env.DAYTONA_PREVIEW_TOKEN;

let failed = 0;
const ok = (name: string, pass: boolean, detail = "") => {
  if (!pass) failed++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
};

const post = (path: string, body: unknown) => fetch(`${BASE}${path}`, { method: "POST", headers, body: JSON.stringify(body) });

const approvedAll = ["identity", "bloodType", "allergies", "medications", "conditions", "history", "body", "contacts", "insurance"];
const shared = { ...demoProfile, approved: approvedAll, unverified: [] };
// Insurance import with no allergies on file: the patient will contradict it.
const insurance = { ...demoProfile, allergies: [], approved: approvedAll, unverified: ["allergies", "medications"] };

async function turn(transcript: string, profile: object = shared, extra: object = {}) {
  const res = await post("/api/turn", { sessionId: "smoke", transcript, profile, ...extra });
  return { status: res.status, body: await res.json() };
}

async function main() {
  const health = await (await fetch(`${BASE}/api/health`, { headers })).json();
  ok("health", health.ok === true, JSON.stringify(health));

  // English -> Spanish and Spanish -> English through /api/turn.
  const en = await turn("I fell off an electric scooter about twenty minutes ago. My left arm is cut and bleeding.");
  ok("turn en->es status", en.status === 200, `${en.status}`);
  ok("turn en->es direction", en.body.source_lang === "en" && en.body.target_lang === "es" && en.body.speaker === "patient", `engine=${en.body.engine} "${en.body.translation}"`);

  const es = await turn("¿Se golpeó la cabeza? ¿Perdió el conocimiento?");
  ok("turn es->en direction", es.body.source_lang === "es" && es.body.target_lang === "en" && es.body.speaker === "clinician", `"${es.body.translation}"`);

  // Allergy safety and profile conflicts.
  const amox = await turn("Voy a limpiar la herida y le voy a dar amoxicilina para prevenir una infección.");
  ok("allergy alert on amoxicilina", amox.body.alerts.some((a: { kind: string }) => a.kind === "allergy"));

  const conflict = await turn("I'm allergic to penicillin. I had anaphylaxis from amoxicillin.", insurance, { unverified: ["allergies", "medications"] });
  const c = conflict.body.alerts.find((a: { id: string }) => a.id === "conflict-allergy-penicillin");
  ok("conflicting allergy warning", Boolean(c), c ? c.message.en : JSON.stringify(conflict.body.alerts));

  const missing = await turn("Do you take any medication?", { ...demoProfile, medications: [], allergies: [], approved: [], unverified: [] });
  ok("turn with nothing approved still translates", missing.status === 200 && Boolean(missing.body.translation));

  // A uuid session is stored in Supabase when configured; without it the turn must still succeed.
  const sid = crypto.randomUUID();
  const stored = await post("/api/turn", { sessionId: sid, transcript: "My right wrist really hurts.", profile: shared });
  const sb = await stored.json();
  ok("uuid session turn", stored.status === 200 && Boolean(sb.translation), `persisted=${sb.persisted}`);
  const end = await post(`/api/session/${sid}/end`, { profile: shared });
  ok("end session", end.status === 200 || (!sb.persisted && end.status >= 400), `status ${end.status}${sb.persisted ? "" : " (no database configured)"}`);

  const bad = await post("/api/turn", { sessionId: "smoke", transcript: "" });
  ok("empty transcript rejected", bad.status === 400);

  // ElevenLabs: TTS -> STT round trip in both languages (language detection).
  if (health.elevenlabs) {
    for (const [lang, text] of [
      ["en", "I take apixaban five milligrams twice a day."],
      ["es", "Del cero al diez, ¿cuánto le duele la muñeca?"],
    ] as const) {
      const t0 = Date.now();
      const tts = await post("/api/tts", { text, lang });
      const audio = await tts.blob();
      ok(`tts ${lang}`, tts.status === 200 && audio.size > 5000, `${audio.size} bytes in ${Date.now() - t0} ms`);
      const form = new FormData();
      form.append("audio", audio, `smoke-${lang}.mp3`);
      const t1 = Date.now();
      const sttRes = await fetch(`${BASE}/api/stt`, { method: "POST", body: form, headers: process.env.DAYTONA_PREVIEW_TOKEN ? { "x-daytona-preview-token": process.env.DAYTONA_PREVIEW_TOKEN } : {} });
      const stt = await sttRes.json();
      ok(`stt ${lang} detects language`, stt.lang === lang, `"${stt.text}" (${stt.languageCode}) in ${Date.now() - t1} ms`);
    }
  } else {
    console.log("SKIP  ElevenLabs TTS/STT (no ELEVENLABS_API_KEY on the server)");
  }

  // Report generation.
  const report = await post("/api/report", {
    sessionId: "smoke",
    startedAt: new Date().toISOString(),
    profile: insurance,
    turns: [
      { speaker: "patient", source_lang: "en", original: en.body.translation ? "I fell off an electric scooter." : "", translation: en.body.translation, at: new Date().toISOString() },
    ],
    notes: [...(en.body.notes ?? []), ...(conflict.body.notes ?? [])],
    warnings: conflict.body.alerts,
  });
  const r = await report.json();
  ok("report generated", report.status === 200 && Boolean(r.narrative?.whatHappened?.en), `engine=${r.engine}`);
  ok("report keeps conflict", r.warnings?.some((w: { id: string }) => w.id === "conflict-allergy-penicillin"));

  console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
