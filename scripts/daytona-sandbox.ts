// Runs the Vital backend inside a Daytona sandbox and smoke-tests it there.
//   npm run sandbox            create sandbox, upload this working tree, install, start, test
//   npm run sandbox -- --keep  leave it running and print the preview URL
//
// Reads DAYTONA_API_KEY, DAYTONA_API_URL, DAYTONA_TARGET, plus ELEVENLABS_API_KEY
// and ANTHROPIC_API_KEY (passed to the sandbox as env vars, never written to files).
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { Daytona } from "@daytona/sdk";

// Load .env.local without adding a dependency.
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2];
}
if (!process.env.DAYTONA_API_KEY) {
  console.error("DAYTONA_API_KEY is missing. Add it to .env.local.");
  process.exit(1);
}

const keep = process.argv.includes("--keep");
const APP = "vital";
const forward = ["ELEVENLABS_API_KEY", "ANTHROPIC_API_KEY", "CLAUDE_MODEL", "ELEVENLABS_VOICE_EN", "ELEVENLABS_VOICE_ES", "ELEVENLABS_STT_MODEL", "ELEVENLABS_TTS_MODEL"];
const envVars = Object.fromEntries(forward.filter((k) => process.env[k]).map((k) => [k, process.env[k] as string]));

async function main() {
  const daytona = new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
    apiUrl: process.env.DAYTONA_API_URL ?? "https://app.daytona.io/api",
    target: process.env.DAYTONA_TARGET ?? "us",
  });

  console.log("Creating sandbox…");
  const sandbox = await daytona.create({
    language: "typescript",
    envVars,
    labels: { project: "vital-hackathon" },
    autoStopInterval: 30, // minutes idle before it stops, to save credits
    public: false,
  });
  console.log(`Sandbox ${sandbox.id}`);

  try {
    const home = (await sandbox.getUserHomeDir()) ?? "/home/daytona";
    const dir = `${home}/${APP}`;

    // Upload tracked + untracked (not ignored) files, so unpushed work is tested too.
    const files = execSync("git ls-files -co --exclude-standard", { encoding: "utf8" })
      .split("\n")
      .filter((f) => f && !f.startsWith(".env"));
    console.log(`Uploading ${files.length} files…`);
    await sandbox.fs.uploadFiles(files.map((f) => ({ source: f, destination: `${dir}/${f}` })));

    const run = async (cmd: string, timeout = 600) => {
      const res = await sandbox.process.executeCommand(cmd, dir, undefined, timeout);
      console.log(`$ ${cmd}\n${res.result.trim().split("\n").slice(-15).join("\n")}`);
      if (res.exitCode !== 0) throw new Error(`"${cmd}" exited with ${res.exitCode}`);
      return res.result;
    };

    await run("node -v && npm -v");
    await run("npm ci --no-audit --no-fund");

    console.log("Starting Next.js on :3000…");
    await sandbox.process.createSession("web");
    await sandbox.process.executeSessionCommand("web", { command: `cd ${dir} && npm run dev -- -H 0.0.0.0 -p 3000 > /tmp/next.log 2>&1`, runAsync: true });
    await run("for i in $(seq 1 60); do curl -sf localhost:3000/api/health && exit 0; sleep 2; done; tail -30 /tmp/next.log; exit 1", 180);

    await run("npx tsx scripts/smoke-test.ts", 300);

    const preview = await sandbox.getPreviewLink(3000);
    console.log(`\nPreview: ${preview.url}`);
    console.log("Private sandbox: send the header x-daytona-preview-token with the token from the Daytona dashboard,");
    console.log(`or run: BASE_URL=${preview.url} DAYTONA_PREVIEW_TOKEN=<token> npm run smoke`);
  } finally {
    if (keep) {
      console.log(`Kept sandbox ${sandbox.id} (auto-stops after 30 idle minutes).`);
    } else {
      console.log("Deleting sandbox…");
      await sandbox.delete();
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
