# la-council

Public repository for a system intended to run privately: a **Signal-first personal assistant** specialized in **Los Angeles City Council system legibility**. The near-term MVP is **web research with citations/links** (delivered via Signal later); longer-term, it grows into LA-specific MCP capabilities (council files/meetings/votes), approval-gated email actions, durable CRM-like memory, and optional “meeting vibe” summaries grounded in transcripts.

## Purpose

Make LA City Council activity *legible*: find the right primary sources, connect the dots, cite everything, and surface what matters—fast—through a conversation-first interface (Signal).

## Non-negotiable architectural boundaries

- **Global loop is pure**
  - The application layer owns the lifecycle + wiring (host ↔ agent ↔ capability surfaces).
  - It does **not** contain LLM prompts, tool policy, ranking heuristics, or model/provider specifics.
- **Agent runtime is pluggable**
  - `src/agent/` can swap models/providers, change prompting strategies, and flush/replace context without changing transports or capability servers.
- **Capabilities live behind MCP servers**
  - `src/mcp/` hosts capability servers (separate processes/services).
  - The agent runtime calls MCP surfaces; tool logic does not “leak” into the orchestrator.
- **Durable state belongs to the system**
  - Persistence (DB/files) is system-owned; the model’s context window is not the source of truth.
  - Any long-lived memory must be stored explicitly and retrieved intentionally.

## MVP scope (this repo, now)

- **Current pass**: directory skeleton + documentation only (no runtime, no Signal integration, no MCP servers implemented).
- **MVP capability target**: web research + citations via an MCP “web” capability server (implemented later).
- **Deployment posture target**: **outbound-only** connectivity; **no inbound ports**. Pull-based execution (e.g., self-hosted runner) later.

## Security posture (vision-level)

- **Connectivity**: outbound-only in typical shared networks; avoid opening inbound listeners when possible.
- **Secrets**: minimize; keep out of repo; rotate; least privilege.
- **Logging**: redact sensitive content; prefer structured logs; avoid storing raw message payloads by default.
- **Side effects**: all externally-visible actions (email, posting, writing records) require explicit approval gates (later).

## Workflow discipline (mandatory)

After every meaningful update in this repo:

1. Update the **README “Current State”** table
2. `git status`
3. `git add -A`
4. `git commit -m "<clear message>"`
5. `git push`

## Run locally

1) Install deps:

```bash
npm install
cd web && npm install
```

2) Terminal A (backend):

```bash
npm run dev:api
```

- Optional auth: set `HTTP_TOKEN=...` before running to require `Authorization: Bearer <token>`.

3) Terminal B (web):

```bash
cd web && npm run dev
```

- If backend auth is enabled, set `VITE_HTTP_TOKEN` in `web/.env.local` (e.g. `VITE_HTTP_TOKEN=...`).

4) Quick sanity check:

```bash
curl http://127.0.0.1:8787/healthz
```

## Model configuration (app layer)

- **Canned model (default)**:
  - `AGENT_MODEL_PROVIDER=canned`
- **OpenAI model**:
  - `AGENT_MODEL_PROVIDER=openai`
  - `AGENT_MODEL_NAME=<model-id>`
  - `OPENAI_API_KEY=...`

## Current State

| Date (YYYY-MM-DD) | Change | Notes / Next |
|---|---|---|
| 2026-01-11 | Repo created + skeleton + README | Next: lock down architecture notes in `docs/` and define the first “pure” global loop interfaces (no implementation). |
| 2026-01-11 | Imported `project-reporter` into `ops/` and tightened logic-only filtering | Next: run it against this repo and confirm it excludes docs/locks/assets while retaining source + config. |
| 2026-01-11 | Fixed `project-reporter` to keep directory tree visible under logic-only filtering | Next: consider adding a CLI/config file for include/exclude rules (still keep defaults safe/noisy-file resistant). |
| 2026-01-11 | Added minimal TypeScript + Vitest scaffolding | Next: define `src/shared` contracts, then implement a DI-first `AgentRuntime` with mocks + unit tests. |
| 2026-01-11 | Added canonical `src/shared` contracts (handoff, citations, agent result) | Next: implement agent ports (model/tools/state/trace) and the minimal runtime loop. |
| 2026-01-11 | Restricted `project-reporter` output to `src/**` only | Next: proceed with `src/agent` ports/runtime without cluttering reports with tooling/docs. |
| 2026-01-11 | Added DI-first agent ports (model/tools/state/trace) | Next: implement `AgentRuntime.handle()` loop + tool-call enforcement and safety caps. |
| 2026-01-11 | Implemented `src/agent/runtime.ts` (tool loop, allowlist, tracing hooks) | Next: add mocks + vitest unit tests (final response, tool call, disallowed tool). |
| 2026-01-11 | Added agent test doubles (MockModel, MemoryStateStore, FakeTools) | Next: add vitest unit tests for runtime behavior + safety. |
| 2026-01-11 | Added vitest unit tests for `AgentRuntime` | Next: optional tiny manual runner; then start wiring global loop later (outside agent). |
| 2026-01-11 | Fixed `HandoffEnvelope` type to match input contract (optional `mode`) | Next: proceed confidently with consumers passing envelopes without `mode` while parse defaults to `mvp`. |
| 2026-01-11 | Removed `src/signal/` and introduced `src/app/` as the host layer (HTTP next) | Next: implement Fastify HTTP host that maps requests to `HandoffEnvelope` and returns `AgentResult`. |
| 2026-01-11 | Added Fastify HTTP host under `src/app/` + `src/index.ts` entrypoint | Next: add host tests using `app.inject()` (no real ports) and enforce auth + validation behavior. |
| 2026-01-11 | Added HTTP host tests (Fastify `inject`) for health, turn, validation, auth | Next: replace the canned in-app model with a real model port + MCP web tools later (agent stays unchanged). |
| 2026-01-11 | Removed `src/global/` folder (host/app layer owns wiring now) | Next: keep orchestration purity in `src/app/` and preserve `src/agent/` as a black-box engine. |
| 2026-01-11 | Tightened HTTP host correctness (auth short-circuit, explicit returns, centralized TurnEngine, 500 JSON) | Next: wire real engine composition in `src/app/createAgent.ts` (still keep `src/agent` pure). |
| 2026-01-11 | Added root `dev:api` script + hardened Vite proxy to IPv4 + local run docs | Next: implement the `web/` chat UI that calls `/turn` (frontend layer). |
| 2026-01-11 | Agent engine supports batched multi-tool-call model outputs (`tool_calls`) | Next: wire a real model adapter that can emit parallel tool calls (no provider integration yet). |
| 2026-01-11 | App composition is now config-driven for model + runtime settings (Option A) | Next: add a real model provider implementation behind the factory (OpenAI later). |
| 2026-01-11 | Implemented OpenAI model provider behind `ModelPort` (Chat Completions + parallel tool calls) | Next: wire real MCP tools and run end-to-end with `/turn` using `AGENT_MODEL_PROVIDER=openai`. |

## Near-term roadmap

- Wire the global loop to a stub agent (interfaces only to start).
- Implement an MCP web capability server (citations-first browsing).
- Implement agent runtime using **LlamaIndex TS** (Pattern 1: agent owns tool loop).
- Implement Signal adapter/transport boundary.
- Add deployment notes (self-hosted runner; pull-based execution).

## Directory layout (minimal)

- `src/agent/`: LLM orchestrator / agent runtime (future)
- `src/mcp/`: MCP capability servers (future)
- `src/shared/`: canonical handoff types, ids, citations (future)
- `src/app/`: application composition + hosts (HTTP for now; other transports later)
- `docs/`: design notes, decisions, references
- `ops/`: deployment notes, runner setup, etc.
- `data/`: local runtime data (gitignored; directory kept via `.gitkeep`)


