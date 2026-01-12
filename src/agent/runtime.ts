import { AgentResultSchema, type AgentResult } from "../shared/agent.js";
import type { Citation } from "../shared/citations.js";
import { HandoffEnvelopeSchema, type HandoffEnvelope } from "../shared/handoff.js";
import { isToolAllowed } from "./config/permissions.js";
import type { ModelMessage, ModelPort } from "./ports/model.js";
import type { StateStore } from "./ports/state.js";
import type { ToolExecutor, ToolResult } from "./ports/tools.js";
import type { SpanHandle, Tracer, TurnHandle } from "./ports/trace.js";

export type AgentRuntimeConfig = {
  maxToolCallsPerTurn: number;
  toolCallTimeoutMs: number;
};

export type AgentRuntimeDeps = {
  model: ModelPort;
  tools: ToolExecutor;
  state: StateStore;
  tracer: Tracer;
  config?: Partial<AgentRuntimeConfig>;
};

const DEFAULT_CONFIG: AgentRuntimeConfig = {
  maxToolCallsPerTurn: 3,
  toolCallTimeoutMs: 5_000
};

const noopSpan: SpanHandle = { end: () => {} };
const noopTurn: TurnHandle = {
  span: () => noopSpan,
  event: () => {},
  end: () => {}
};
const noopTracer: Tracer = { startTurn: () => noopTurn };

const MAX_TOOL_CALLS_TEXT = "Sorry — I hit the maximum number of tool calls for this turn.";
const DISALLOWED_TOOL_TEXT = "Sorry — that capability isn't enabled in this agent.";
const TOOL_FAILED_TEXT = "Sorry — a tool failed while trying to help with that.";
const EMPTY_TOOL_CALLS_TEXT = "Sorry — I received an empty tool call request.";

function nowMs(): number {
  return Date.now();
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return p;
  let t: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => {
    if (t) clearTimeout(t);
  });
}

function systemPrompt(): string {
  return [
    "You are a research assistant.",
    "Be concise and factual.",
    "When you use web tools, include citations as URLs in your answer."
  ].join("\n");
}

function toModelMessages(history: Array<{ role: "user" | "assistant"; content: string }>): ModelMessage[] {
  return history.map((m) => ({ role: m.role, content: m.content }));
}

export class AgentRuntime {
  private readonly model: ModelPort;
  private readonly tools: ToolExecutor;
  private readonly state: StateStore;
  private readonly tracer: Tracer;
  private readonly config: AgentRuntimeConfig;

  constructor(deps: AgentRuntimeDeps) {
    this.model = deps.model;
    this.tools = deps.tools;
    this.state = deps.state;
    this.tracer = deps.tracer ?? noopTracer;
    this.config = { ...DEFAULT_CONFIG, ...(deps.config ?? {}) };
  }

  async handle(envelope: HandoffEnvelope): Promise<AgentResult> {
    const parsed = HandoffEnvelopeSchema.parse(envelope);
    const turn = this.tracer.startTurn({
      threadId: parsed.threadId,
      messageId: parsed.messageId,
      mode: parsed.mode
    });

    const toolTrace: Array<{ tool: string; ms: number; ok: boolean }> = [];
    const citations: Citation[] = [];

    try {
      const loadSpan = turn.span("state.load");
      const history = await this.state.load(parsed.threadId);
      loadSpan.end({ count: history.length });

      const toolsSpan = turn.span("tools.listTools");
      const toolDefs = await this.tools.listTools(parsed.mode);
      toolsSpan.end({ count: toolDefs.length });

      const messages: ModelMessage[] = [
        ...toModelMessages(history),
        { role: "user", content: parsed.userText }
      ];

      let toolCalls = 0;
      while (true) {
        const modelSpan = turn.span("model.generate");
        const out = await this.model.generate({
          system: systemPrompt(),
          messages,
          tools: toolDefs
        });
        modelSpan.end({ type: out.type });

        if (out.type === "final") {
          const appendUserSpan = turn.span("state.append.user");
          await this.state.append(parsed.threadId, { role: "user", content: parsed.userText });
          appendUserSpan.end();

          const appendAssistantSpan = turn.span("state.append.assistant");
          await this.state.append(parsed.threadId, { role: "assistant", content: out.text });
          appendAssistantSpan.end();

          const result: AgentResult = {
            replyText: out.text,
            citations,
            toolTrace: toolTrace.length ? toolTrace : undefined
          };
          turn.end("ok", { toolCalls, citations: citations.length });
          return AgentResultSchema.parse(result);
        }

        // tool calls (batched)
        if (!out.calls.length) {
          turn.event("safety.empty_tool_calls");
          const result: AgentResult = { replyText: EMPTY_TOOL_CALLS_TEXT, citations, toolTrace };
          turn.end("error", { toolCalls });
          return AgentResultSchema.parse(result);
        }

        // Enforce allowlist across the batch before calling any tools.
        const disallowed = out.calls.find((c) => !isToolAllowed(c.tool));
        if (disallowed) {
          turn.event("safety.disallowed_tool", { tool: disallowed.tool });
          const result: AgentResult = { replyText: DISALLOWED_TOOL_TEXT, citations, toolTrace };
          turn.end("error", { disallowedTool: disallowed.tool });
          return AgentResultSchema.parse(result);
        }

        // Enforce max calls per turn across the whole turn, counting each call individually.
        for (const _ of out.calls) {
          toolCalls += 1;
          if (toolCalls > this.config.maxToolCallsPerTurn) {
            turn.event("safety.max_tool_calls_exceeded", { toolCalls, max: this.config.maxToolCallsPerTurn });
            const result: AgentResult = { replyText: MAX_TOOL_CALLS_TEXT, citations, toolTrace };
            turn.end("error", { toolCalls });
            return AgentResultSchema.parse(result);
          }
        }

        const toolSpan = turn.span("tools.call");
        const results = await Promise.allSettled(
          out.calls.map(async (call) => {
            const start = nowMs();
            const r = await withTimeout(this.tools.call(call.tool, call.args), this.config.toolCallTimeoutMs, call.tool);
            const ms = nowMs() - start;
            return { call, result: r, ms };
          })
        );

        // If any tool call fails, stop the turn (do not continue).
        const failed = results.find((r) => r.status === "rejected");
        if (failed) {
          toolSpan.end({ ok: false });
          // record trace for any completed calls; failing call has no per-call ms
          for (const r of results) {
            if (r.status === "fulfilled") {
              toolTrace.push({ tool: r.value.call.tool, ms: r.value.ms, ok: true });
              if (r.value.result.citations?.length) citations.push(...r.value.result.citations);
            }
          }
          turn.end("error", { tool: "batch" });
          return AgentResultSchema.parse({ replyText: TOOL_FAILED_TEXT, citations, toolTrace });
        }

        toolSpan.end({ ok: true, calls: out.calls.length });

        // All succeeded; preserve message order from out.calls.
        const fulfilled = results as Array<
          { status: "fulfilled"; value: { call: { id?: string; tool: string; args: unknown }; result: ToolResult; ms: number } }
        >;
        for (const r of fulfilled) {
          toolTrace.push({ tool: r.value.call.tool, ms: r.value.ms, ok: true });
          if (r.value.result.citations?.length) citations.push(...r.value.result.citations);
          messages.push({
            role: "tool",
            name: r.value.call.tool,
            content: r.value.result.content ?? "",
            toolCallId: r.value.call.id
          });
        }
      }
    } catch (err) {
      turn.end("error", { error: String(err) });
      const text = "Sorry — something went wrong while handling that message.";
      return AgentResultSchema.parse({ replyText: text, citations: [], toolTrace: toolTrace.length ? toolTrace : undefined });
    }
  }
}


