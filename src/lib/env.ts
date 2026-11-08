// Server-only env access. Never import this from client components.
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

export const env = {
  get anthropicKey() { return required("ANTHROPIC_API_KEY"); },
  get elevenLabsKey() { return required("ELEVENLABS_API_KEY"); },
  get claudeModel() { return process.env.CLAUDE_MODEL ?? "claude-haiku-5-5"; },
};
