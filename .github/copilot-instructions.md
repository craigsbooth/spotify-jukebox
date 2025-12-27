<!-- Copilot / AI agent instructions for spotify-jukebox -->

# Quick Context
- Purpose: This repo hosts a Next.js frontend (client/) and an Express backend (server.js) that coordinates a Spotify "jukebox" with a DJ/autoplay mode.
- Serves as a small single-host app: backend (API + Spotify integration) + frontend (Next.js app under `client/`).

# Architecture & Key Files
- `server.js`: single-file Express backend. Exports `app` for tests and listens when run directly. Contains core state: `partyQueue`, `shuffleBag`, `playedHistory`, `djStatus` and the Spotify API integration.
- `tokens.json`, `settings.json`: local runtime persistence for tokens and UI settings. Tests set `NODE_ENV=test` to prevent writes.
- `client/`: Next.js app (app dir). See `client/app`, `client/guest`, `client/projector` for UI routes and `client/__tests__` for React tests.
- Tests: server tests live in `server/__tests__` (Jest + supertest). Client tests in `client/__tests__`.

# Important Behaviors & Patterns (do not change lightly)
- Test-mode gating: `const isTest = process.env.NODE_ENV === 'test'`. When true, file writes, intervals and some side-effects are skipped. Use this when running automated tests.
- Spotify integration: uses `spotify-web-api-node`. `refreshShuffleBag()` pages playlist tracks (limit=100) and repopulates `shuffleBag`. Be careful with rate limits and async paging logic.
- DJ auto-mix: a setInterval drives DJ behavior (volume ducking, pre-transition status, and an automatic mix that POSTs `/pop` then uses `spotifyApi.play`). This is time-sensitive logic — tests and local changes should not run the interval (isTest prevents it).
- Queue model: frontend adds tracks with `POST /queue` (requires `guestId`). Tracks include `votedBy` arrays and are sorted by `votes` on write.

# Useful Endpoints (examples)
- GET `/queue` — returns combined guest queue + a buffered slice from `shuffleBag`.
- POST `/queue` — body: `{ uri, name, artist, albumArt, album, guestId }` (returns upvote or add behavior).
- POST `/pop` — backend selects next track, analyzes audio features, sets mix point and returns the track.
- POST `/dj-mode` and GET `/dj-status` — toggle and inspect DJ mode.
- GET `/login` and GET `/callback` — OAuth flow (requires `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `REDIRECT_URI` in env).

# Run / Test / Dev workflows
- Start backend (dev): from repo root run:

```bash
npm run dev    # runs nodemon server.js (root package.json)
```

- Start backend (production):

```bash
npm start      # node server.js
```

- Frontend (client) dev:

```bash
cd client
npm run dev    # Next.js dev server
```

- Tests:
  - Server tests (root): `npm test` (runs `jest server/__tests__`)
  - Client tests: `cd client && npm test`
  - Ensure `NODE_ENV=test` is set so `server.js` avoids file writes and intervals.

# Conventions & Tips for Agents
- Keep changes minimal and preserve the single-file `server.js` approach: it's intentionally compact and stateful (state variables at top). Refactor only when splitting responsibilities with clear tests.
- Avoid committing real Spotify credentials. Use `.env` locally; production deploys should set env vars externally.
- When modifying state persistence (`tokens.json`, `settings.json`), respect `isTest` gating.
- If you modify DJ timing logic, update tests or add feature flags — this code relies on millisecond timing and setInterval behavior.
- When calling Spotify APIs in edits, prefer async/await and handle rate-limit/errors gracefully (the existing code logs and continues).

# Files to inspect when changing behavior
- `server.js` — primary place for backend logic and endpoints.
- `client/app` and `client/guest` — UI pages that call the API and rely on the `/token`, `/queue`, `/pop`, `/dj-status` endpoints.
- `client/README.md` and `client/jest.config.js` — useful for client-specific test/run details.

# If you are unsure
- Ask for the intended deployment target (local dev vs hosted) before changing persistence or OAuth redirect URIs.

---
If anything above is unclear or you'd like more detail (example request/response shapes, test coverage notes, or suggested small refactors), tell me which area to expand.
