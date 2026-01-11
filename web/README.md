# Web UI (Vite + React + TypeScript)

Minimal ChatGPT-style chat UI for the `la-council` backend HTTP host.

## Run

From `web/`:

```bash
npm install
npm run dev
```

## Backend requirements

Backend must be running at `http://localhost:8787` and expose:

- `GET /healthz`
- `POST /turn` (expects a `HandoffEnvelope` JSON body; returns `AgentResult` JSON)

This web app calls **relative** URLs (`/turn`, `/healthz`). Vite dev server proxies them to the backend.

## Auth (optional)

If backend has `HTTP_TOKEN` set, create `web/.env.local`:

```bash
VITE_HTTP_TOKEN=secret
```

Frontend will send `Authorization: Bearer <token>` when `VITE_HTTP_TOKEN` is present.

## Quick test

1. Start backend on port 8787.
2. Start web dev server (`npm run dev`).
3. Open the dev server URL and send a message.
