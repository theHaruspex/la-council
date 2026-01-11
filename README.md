# la-council

Public repository for a system intended to run privately: a **Signal-first personal assistant** specialized in **Los Angeles City Council system legibility**. The near-term MVP is **web research with citations/links** (delivered via Signal later); longer-term, it grows into LA-specific MCP capabilities (council files/meetings/votes), approval-gated email actions, durable CRM-like memory, and optional “meeting vibe” summaries grounded in transcripts.

## Purpose

Make LA City Council activity *legible*: find the right primary sources, connect the dots, cite everything, and surface what matters—fast—through a conversation-first interface (Signal).

## Non-negotiable architectural boundaries

- **Global loop is pure**
  - `src/global/` owns the lifecycle + wiring (Signal ↔ AgentRuntime ↔ MCP surfaces).
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

## Current State

| Date (YYYY-MM-DD) | Change | Notes / Next |
|---|---|---|
| 2026-01-11 | Repo created + skeleton + README | Next: lock down architecture notes in `docs/` and define the first “pure” global loop interfaces (no implementation). |
| 2026-01-11 | Imported `project-reporter` into `ops/` and tightened logic-only filtering | Next: run it against this repo and confirm it excludes docs/locks/assets while retaining source + config. |
| 2026-01-11 | Fixed `project-reporter` to keep directory tree visible under logic-only filtering | Next: consider adding a CLI/config file for include/exclude rules (still keep defaults safe/noisy-file resistant). |

## Near-term roadmap

- Wire the global loop to a stub agent (interfaces only to start).
- Implement an MCP web capability server (citations-first browsing).
- Implement agent runtime using **LlamaIndex TS** (Pattern 1: agent owns tool loop).
- Implement Signal adapter/transport boundary.
- Add deployment notes (self-hosted runner; pull-based execution).

## Directory layout (minimal)

- `src/global/`: global loop + lifecycle wiring (**pure**)
- `src/signal/`: Signal adapter/transport boundary (future)
- `src/agent/`: LLM orchestrator / agent runtime (future)
- `src/mcp/`: MCP capability servers (future)
- `src/shared/`: canonical handoff types, ids, citations (future)
- `docs/`: design notes, decisions, references
- `ops/`: deployment notes, runner setup, etc.
- `data/`: local runtime data (gitignored; directory kept via `.gitkeep`)


