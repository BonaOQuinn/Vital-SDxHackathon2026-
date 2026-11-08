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
- **Kilograms first, always with the unit.** Clinician-facing weight leads with kg and shows the original in parentheses (e.g. `82 kg (180 lb)`). Never show a bare number without its unit, and never record a pound value as kg (NCCMERP and ISMP flag this as a cause of dosing errors). Height shows cm first, temperature in °C. Add round-trip tests for lb/kg and ft-in/cm. Keep lab values (e.g. glucose mg/dL vs mmol/L) out of the demo profile, because they need per-test conversion factors.
- **Clinician-facing medical history is shown in Spanish with converted units.** When the profile is presented to the clinician (on the phone, the projector view, and the summary), render it in Spanish. Convert units in plain code to what local staff use (e.g. lb to kg, ft-in to cm, plus any other US units on the profile), and keep the original value next to it (e.g. `82 kg (180 lb)`). Translate free-text fields (history, conditions) with Claude, keeping drug names and numbers verbatim. Fixed fields (labels, blood type, allergy names) use a static Spanish dictionary so they never depend on the LLM. The patient's own view stays in English.
- **Keep replies to one or two sentences** to limit latency (estimated 1.5 to 3 s per turn, unmeasured).
- **Privacy:** fake data only. Sessions are stored until the summary link expires. Production needs encryption, consent and zero-retention agreements (ElevenLabs BAA and zero-retention are enterprise-only).
- **Fallbacks:** typed-text input into the same pipeline, a push-to-talk toggle, pre-rendered audio for script lines, a backup video, and phone hotspots (venue is SDSU wifi).

## Open items
- No Claude API key yet (alternative: an ElevenLabs Agent with its hosted LLM).
- ElevenLabs credits: Bona has a coupon worth 131,000 credits (see ElevenLabs credits below). Daytona has $100 in credits.
- The 45-minute ElevenLabs Agent test has not been run (owner: Bona). Scribe's handling of alternating English and Spanish is not verified.
- Database choice, final role assignments, demo time limit and the closing pitch line are not decided.

## Team
Bona, Chris, Mia, Luis. Chris has used ElevenLabs before but is away for the first half of the build window, so Bona owns the voice layer until he arrives. Others have little or no ElevenLabs experience. Work is largely agent-assisted, so humans must review, debug and own each piece for the demo.

Roles:
- **Bona, voice layer (takes over from Chris for the first half):** owns everything that touches ElevenLabs, including its server side: `/api/scribe-token`, the mic-streaming hook, text-to-speech playback, half-duplex mic gating, the push-to-talk fallback, and the 45-minute Agent test. Also owns `/api/turn` (Claude call and safe-mode prompt) because it is coupled to the voice loop. Chris has used ElevenLabs before, so ask him for tips when he arrives.
- **Chris, backend and integration (joins for the second half):** owns the database and seed script, injury extraction, summaries, and the `/s/[token]` page, plus the typed-text fallback. Until he arrives, these are unowned and sit behind the voice loop in priority. Once the voice loop works, Chris pairs with Bona to understand how `/api/turn` fits the voice code.
- **Mia, frontend:** phone conversation screen, profile form with unit conversion, projector view `/view/[sessionId]`, summary screen, and the emergency button.
- **Luis, pitch, demo and QA:** pitch script, judge Q&A, demo rehearsal, backup video, pre-rendered audio, failure-path testing, and asking organizers about rules, time limit and credits.

Handoff contract between Bona (voice and `/api/turn`) and Chris (backend, from the second half): `/api/turn` takes a transcript plus session id and returns `{speaker, source_lang, translation, alerts[], flagged_terms[]}`. Agree on this when Chris arrives.

## ElevenLabs credits
- Bona has a coupon for 131,000 ElevenLabs credits, so the free plan limit (15 min) no longer constrains the build. Redeem it on Bona's account before the 45-minute Agent test, and create the API key from that account.
- Use the one account for everything so usage and the coupon balance stay in one place. The key stays on the server (`/api/scribe-token` hands the browser a single-use token). Never commit the key or the coupon code.
- Credits are not minutes. Check Settings > Usage on the dashboard after the first test to see the real burn rate for Scribe, Flash v2.5 and any Agent session, then decide whether Flash v2.5 is enough or higher-quality voices are affordable.
- With this budget, rehearsals and the Agent test can run freely, but still avoid leaving a mic stream open when idle.
