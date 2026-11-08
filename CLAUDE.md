# CLAUDE.md

Guidance for Claude Code in this repo. Source of truth for product context is `project-context.md` (export of the team's Google Doc). This file records the decisions made in the grill-me interview on 2026-11-08.

## Project overview
**Vital** is a hands-free voice agent for medical emergencies abroad, built for the SDx 2026 hackathon (sponsors: ElevenLabs, Daytona). It translates live between a traveler and local medical staff, carries the patient's profile into the conversation, documents the injury as it is described, and produces a clinician-ready summary.

- Build window 12:00 to 4:30 on Sun Nov 8, 2026. Judging and demos 4:30 to just before 6:00.
- Judges want something that can go to market and scale. Scale story (accounts, hospitals, insurers) is told on a slide, not built.
- Safeguard: Vital translates and organizes. It does not diagnose and does not replace professional interpreters or emergency services.

## Demo definition
- One iPhone shared by both speakers, hands-free. Patient speaks English, clinician speaks Spanish (a Spanish-fluent teammate plays the doctor). Direction is fixed, so the detected language identifies the speaker.
- A second synced web view on a laptop is shown on the projector (no screen mirroring).
- Single user flow with a prefilled fake profile (including emergency contacts). The profile creation form exists in the app but is shown only as screenshots in the pitch.
- Must-have: live two-way translation and a shareable summary link. Out of scope for now: notifying emergency contacts, telephony, accounts, nurse and EMS summaries (explained in the pitch only).

## Tech stack
- Next.js (App Router) and TypeScript in one codebase, deployed on Vercel.
- ElevenLabs Scribe v2 Realtime for speech-to-text and Flash v2.5 for text-to-speech (one voice per language).
- Claude (fast model, structured outputs) for translation, injury extraction and summaries.
- Managed Postgres with realtime (Supabase or Neon, not yet chosen).
- Daytona: off the critical path. Optional use for PDF export or a shared dev environment.

## Architecture
1. Browser captures mic audio (iPhone Safari needs HTTPS and a "Start" tap). Audio streams to Scribe using a single-use token from `/api/scribe-token`, so the API key stays on the server.
2. Each committed transcript is sent to `POST /api/turn`.
3. `/api/turn` calls Claude with the patient profile in the system prompt and returns `{speaker, source_lang, translation, alerts[], flagged_terms[]}`. Claude identifies the language itself, so we do not rely on Scribe's language field.
4. Translation text shows on screen first, then Flash v2.5 plays it. The mic is gated while audio plays (half-duplex) to prevent echo on a single phone.
5. A separate non-blocking Claude call updates the structured injury record after each turn.
6. At the end, one Claude call writes the Spanish doctor summary and the English patient copy.
7. Session data lives in the database. The projector view `/view/[sessionId]` subscribes to the session (1 s polling as the fallback). The summary link `/s/[token]` is public and read-only, and checks `expires_at` on read.

Tables: `profiles`, `sessions` (transcript, injury record, summaries, `expires_at`), `summary_links`.

## Implementation rules
- **Verbatim safe-mode:** drug names and numbers stay verbatim, low-confidence terms are flagged aloud, and critical details are read back for confirmation.
- **Allergy and profile alerts:** spoken in both languages and shown as a banner.
- **Emergency button:** a visible "Call emergency services" button plus the local emergency number from a small country lookup table (Mexico, 911, for the demo).
- **Unit conversion** (kg/lb, cm/ft-in) is plain code, never the LLM. Store metric and show both.
- **Keep replies to one or two sentences** to limit latency (estimated 1.5 to 3 s per turn, unmeasured).
- **Privacy:** fake data only. Sessions are stored until the summary link expires. Production needs encryption, consent and zero-retention agreements (ElevenLabs BAA and zero-retention are enterprise-only).
- **Fallbacks:** typed-text input into the same pipeline, a push-to-talk toggle, pre-rendered audio for script lines, a backup video, and phone hotspots (venue is SDSU wifi).

## Open items
- No Claude API key yet (alternative: an ElevenLabs Agent with its hosted LLM).
- ElevenLabs credits unknown (free plan is 15 min). Ask staff at kickoff. Daytona has $100 in credits.
- The 45-minute ElevenLabs Agent test has not been run (owner: Chris). Scribe's handling of alternating English and Spanish is not verified.
- Database choice, final role assignments, demo time limit and the closing pitch line are not decided.

## Team
Bona, Chris, Mia, Luis. Chris has used ElevenLabs before and is the natural owner of the voice layer. Others have little or no ElevenLabs experience. Work is largely agent-assisted, so humans must review, debug and own each piece for the demo.
