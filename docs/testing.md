# How to test Vital yourself

Live app: https://vital-sdx-hackathon.vercel.app (HTTPS, so the iPhone mic works).
Every full run uses the paid Claude and ElevenLabs keys. Keep rehearsals short (the Claude balance is $20).

## On a phone (iPhone Safari)
1. Open the URL. Home lists the flow: profile, share, translation, report.
2. Create a profile (Welcome, then Create profile) or skip it. Without one, the demo patient Jordan Ellis is used.
3. Tap **Start translation**. Allow the microphone. Tap Start (Safari needs the tap).
4. Speak English as the patient, then have the Spanish speaker answer. Or use the typed box at the bottom, with its language picker, to test without voice.
5. Say or type "I hit my forehead" (blood-thinner alert) and "le voy a dar amoxicilina" (penicillin allergy alert).
6. End the conversation, then open **Patient Emergency Report**. It saves the session (about 20 s) and shows a share link.
7. Open the share link on a second device. It shows the doctor (Spanish) and patient (English) summaries, sources, and the transcript.

## What to check
- The translation text appears, then plays aloud. Drug names and numbers are unchanged ("apixaban", "5 milligrams").
- Alerts show in both languages. The Call button shows 911 for Mexico.
- Per-turn time is about 2 to 5 s. Tell Bona if it feels slow (a faster model is one env var).
- The share link opens. An old link (after 24 h) shows "This link has expired."
- Not built yet: the projector page `/view/<sessionId>`. The data endpoint exists (below).

## Without the UI (curl or a browser)
- Health: `/api/health` should show `anthropic: true, elevenlabs: true`.
- Typed turn: POST `/api/turn` with `{"sessionId":"<uuid>","transcript":"My wrist hurts"}`. The session id must be a UUID or the turn is not stored.
- Live session data (projector): GET `/api/session/<uuid>`. The injury record lags the conversation by 10 to 20 s.
- Summary link: POST `/api/session/<uuid>/end`, then open the returned `/s/<token>`.
- Fixtures: `/s/demo` shows the scripted demo summary without any API calls.
- All endpoints: `docs/backend-api.md`.

## Local development
1. `git pull origin main`, then `npm install`.
2. `vercel login`, then in the repo `vercel link` (team bona-os-projects, project vital-sdx-hackathon), then `vercel env pull .env.local` (never commit it).
3. `npm run dev`, open http://localhost:3000. The iPhone mic needs HTTPS, so test voice on the deployed URL.
4. Unit tests: `npm test`.
5. Deploy (Bona or anyone linked): `vercel deploy --prod --scope bona-os-projects`. Pushes to `main` do not deploy on their own.

## If something breaks
- Turn fails (502): check `/api/health`, then the Anthropic balance and the Vercel function logs.
- Mic silent on iPhone: you must tap Start, use HTTPS, and allow the microphone for the site.
- Summary link says unavailable: the session had no stored turns (non-UUID id) or the database call failed.
- Fallbacks: typed input, push-to-talk, the `/s/demo` page, the backup video.
