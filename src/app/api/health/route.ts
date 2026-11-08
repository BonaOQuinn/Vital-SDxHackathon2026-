export function GET() {
  return Response.json({
    ok: true,
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
    daytona: Boolean(process.env.DAYTONA_API_KEY),
  });
}
