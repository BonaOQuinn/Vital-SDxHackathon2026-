// Server-only env access. Never import this from client components.
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

export const env = {
  get anthropicKey() { return required("ANTHROPIC_API_KEY"); },
  get hasAnthropic() { return Boolean(process.env.ANTHROPIC_API_KEY); },
  get elevenLabsKey() { return required("ELEVENLABS_API_KEY"); },
  get claudeModel() { return process.env.CLAUDE_MODEL ?? "claude-opus-5-5"; },
  get sttModel() { return process.env.ELEVENLABS_STT_MODEL ?? "scribe_v2"; },
  get ttsModel() { return process.env.ELEVENLABS_TTS_MODEL ?? "eleven_flash_v2_5"; },
  /** Model for cloned voices: best at keeping a speaker's voice across languages. */
  get cloneTtsModel() { return process.env.ELEVENLABS_CLONE_TTS_MODEL ?? "eleven_multilingual_v2"; },
  // Defaults are ElevenLabs premade voices; run `npm run voices:design` to generate custom ones.
  get voiceEn() { return process.env.ELEVENLABS_VOICE_EN ?? "JBFqnCBsd6RMkjVDRZzb"; },
  get voiceEs() { return process.env.ELEVENLABS_VOICE_ES ?? "EXAVITQu4vr4xnSDxMaL"; },
  get supabaseUrl() { return required("NEXT_PUBLIC_SUPABASE_URL"); },
  get supabaseServiceKey() { return required("SUPABASE_SERVICE_ROLE_KEY"); },
};
