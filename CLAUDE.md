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
- The 45-minute ElevenLabs Agent test has not been run (owner: Chris). Scribe's handling of alternating English and Spanish is not verified.
- Database choice, an owner for pitch and QA, demo time limit and the closing pitch line are not decided.

## Team
Bona, Chris, Mia, Luis. Chris has used ElevenLabs before and owns the voice agent. Others have little or no ElevenLabs experience. Work is largely agent-assisted, so humans must review, debug and own each piece for the demo. Chris is here for the whole build window. Mia builds against the `/api/turn` contract and mock data until the backend is live.

### Chris, ElevenLabs voice agent
Owns everything that touches ElevenLabs, including its server side. After the voice loop works (about 2:45), he moves to backend and integration work: first the summary link and the typed-text fallback, then whatever Bona hands over. Pairs with Bona early to understand how `/api/turn` fits the voice code.
- [ ] Run the 45-minute test first: alternate English and Spanish through Scribe v2 Realtime and (optionally) one ElevenLabs Agent in the dashboard. Check that language switching works, the right voice is picked per language, and drug names survive. Report the result before building further.
- [ ] `GET /api/scribe-token`: server route that returns a single-use Scribe token (expires in 15 minutes) so the API key stays on the server.
- [ ] Mic-streaming hook: stream browser mic audio to Scribe, emit committed transcripts. Works on iPhone Safari (HTTPS and a "Start" tap).
- [ ] On each committed transcript, call `POST /api/turn` and receive `{speaker, source_lang, translation, alerts[], flagged_terms[]}`.
- [ ] Text-to-speech playback with Flash v2.5, one voice per language (English patient, Spanish clinician). Show the translation text on screen before audio plays.
- [ ] Half-duplex mic gating: mute the mic while audio plays so one shared phone does not hear itself.
- [ ] Spoken alerts in both languages for allergy and profile alerts, plus read-back of critical details.
- [ ] Push-to-talk toggle fallback and a typed-text input that feeds the same `/api/turn` pipeline.
- [ ] Use ASR keywords (up to 50) for drug names from the demo profile.
- [ ] Measure per-turn latency and report it (target 1.5 to 3 s, currently an unmeasured estimate).

### Bona, backend setup
Owns the server, data and Claude integration. Does not own anything that talks to ElevenLabs directly.
- [ ] Set up the Next.js (App Router) and TypeScript project, the Vercel deploy, and environment variables (Claude key, ElevenLabs key). Get a Claude API key (open item).
- [ ] Choose and set up managed Postgres with realtime (Supabase or Neon) and create the `profiles`, `sessions` (transcript, injury record, summaries, `expires_at`) and `summary_links` tables.
- [ ] `POST /api/turn`: Claude call with the patient profile in the system prompt and the verbatim safe-mode rules (drug names and numbers verbatim, low-confidence terms flagged, critical details read back). Returns `{speaker, source_lang, translation, alerts[], flagged_terms[]}`. Claude identifies the language itself. Keep replies to one or two sentences.
- [ ] Persist each turn to the session record, and expose session data for the projector view (realtime subscription, 1 s polling as fallback).
- [ ] Injury extraction: separate non-blocking Claude call after each turn that updates the structured injury record.
- [ ] End-of-session summaries: one Claude call that writes the Spanish doctor summary and the English patient copy. Drug names and numbers verbatim.
- [ ] Summary link: `/s/[token]` public, read-only page that checks `expires_at` on read and shows an expired state.
- [ ] Unit conversion in plain code (never the LLM): kg first with the original in parentheses, cm first, °C, round-trip tests for lb/kg and ft-in/cm.
- [ ] Emergency number lookup table (Mexico, 911 for the demo).
- [ ] Publish the `/api/turn` contract to Chris and Mia in the first 15 minutes; test it with typed text so the backend can be checked before the voice loop is ready.

### Mia, frontend
Owns every screen. Builds against the `/api/turn` contract and mock data until the backend is live.
- [ ] Phone conversation screen (mobile first, iPhone Safari): Start tap, live captions of the original and the translation, who is speaking, and a clear recording and playing state.
- [ ] Allergy and profile alert banner, shown in both languages.
- [ ] Visible "Call emergency services" button with the local number.
- [ ] Projector view `/view/[sessionId]`: synced live transcript, injury record and profile on the laptop.
- [ ] Clinician profile view in Spanish with converted units, e.g. `82 kg (180 lb)`. Fixed labels use a static Spanish dictionary; the patient view stays in English.
- [ ] Summary screen formatted for doctors, with the shareable link and a QR or copy button.
- [ ] Profile creation form with unit conversion (built, but shown as screenshots in the pitch only).
- [ ] Typed-text input and a push-to-talk control on the phone screen, wired with Chris.

### Luis, patient profile
Owns the profile content and its data. Pitch and QA are not assigned to anyone now (see below).
- [ ] Write the fake demo patient profile: name, age, blood type, allergies (include one that triggers an alert, such as penicillin), current medications with exact drug names, conditions and medical history, height and weight in US units, and emergency contacts.
- [ ] Provide the profile as a seed file (JSON) matching the `profiles` table, agreed with Bona.
- [ ] Provide the Spanish dictionary for fixed fields (labels, blood type, allergy names) and a reviewed Spanish rendering of the free-text history.
- [ ] Build the profile creation form content and the screenshots used in the pitch, with Mia.
- [ ] Write the demo scenario around the profile (the injury, what the patient says) so the alert and verbatim drug-name paths both fire.
- [ ] Keep lab values out of the profile.

### Unassigned: pitch, rehearsal and QA
Pitch script, judge Q&A, scale slide, demo rehearsal, backup video, pre-rendered audio for script lines, failure-path testing, and asking organizers about the time limit, rules and credits were Luis's earlier. Nobody owns them now. Decide an owner before 3:00.

Handoff contract between Chris, Bona and Mia: `/api/turn` takes a transcript plus session id and returns `{speaker, source_lang, translation, alerts[], flagged_terms[]}`. Agree on this in the first 15 minutes.

## ElevenLabs credits
- Bona has a coupon for 131,000 ElevenLabs credits, so the free plan limit (15 min) no longer constrains the build. Redeem it on Bona's account and create the API key there, then share the key with Chris (via the Vercel env vars, not chat or the repo) before his 45-minute test.
- Use the one account for everything so usage and the coupon balance stay in one place. The key stays on the server (`/api/scribe-token` hands the browser a single-use token). Never commit the key or the coupon code.
- Credits are not minutes. Check Settings > Usage on the dashboard after the first test to see the real burn rate for Scribe, Flash v2.5 and any Agent session, then decide whether Flash v2.5 is enough or higher-quality voices are affordable.
- With this budget, rehearsals and the Agent test can run freely, but still avoid leaving a mic stream open when idle.
