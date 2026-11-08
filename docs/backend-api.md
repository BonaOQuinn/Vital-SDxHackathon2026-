# Vital backend API (Bona)

Live at https://vital-sdx-hackathon.vercel.app. Types live in `src/lib/contract.ts` and `src/data/types.ts`.
Session ids must be UUIDs (`crypto.randomUUID()`); anything else is translated but not stored.

## POST /api/turn
Body: `{ sessionId, transcript, profile?, history? }` (plus Chris's voice fields, see `contract.ts`).
Returns `{ speaker, source_lang, translation, alerts[], flagged_terms[], original, index?, persisted }`.
- Claude (Opus 5.5) detects the language: English is the patient, Spanish is the clinician.
- `alerts[]` are `{ id, kind, message: {en, es}, trigger }`; `flagged_terms[]` are `{ term, reason, readBack }`.
- The turn is stored on the session. A background call then updates the injury record (10 to 20 s).
- Allergy alerts have a code-side safety net using the profile's cross-reactive terms.

## GET /api/session/:id
Poll about once a second for the projector view. Returns `{ id, status, transcript[], injury_record, summary_es, summary_en, expires_at, updated_at }`.
Each stored turn has `index`, `at` (timestamp) and the fields of `TurnResponse`. 400 bad id, 404 unknown, 410 expired.

## POST /api/session/:id/end
Body (optional): `{ profile?, regenerate? }`. Writes the Spanish doctor summary and English patient copy
(about 20 s, show a loading state), stores them, and returns `{ token, expiresAt, path: "/s/<token>", regenerated }`.
Calling it again returns the same link. Pass the patient's profile so the link page can show it (defaults to the demo profile).

## GET /s/:token and GET /api/summary/:token
Public, read-only. Expiry is checked on the server on every read (410 expired, 404 unknown). The token `demo` serves the fixtures.

## GET /api/emergency?country=MX
Returns `{ country, number, isFallback }`. Same table in `src/lib/emergency.ts`. Unknown countries fall back to 112.

## Plain-code helpers (never the LLM)
`src/lib/units.ts`: lb/kg, ft-in/cm, °F/°C with round-trip tests. Run tests with `npm test`.
