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

        // tool call
        toolCalls += 1;
        if (toolCalls > this.config.maxToolCallsPerTurn) {
          turn.event("safety.max_tool_calls_exceeded", { toolCalls, max: this.config.maxToolCallsPerTurn });
          const text = "Sorry — I hit the maximum number of tool calls for this turn.";
          const result: AgentResult = { replyText: text, citations, toolTrace };
          turn.end("error", { toolCalls });
          return AgentResultSchema.parse(result);
        }

        if (!isToolAllowed(out.tool)) {
          turn.event("safety.disallowed_tool", { tool: out.tool });
          const text = "Sorry — that capability isn't enabled in this agent.";
          const result: AgentResult = {
            replyText: text,
            citations,
            toolTrace
          };
          turn.end("error", { disallowedTool: out.tool });
          return AgentResultSchema.parse(result);
        }

        const start = nowMs();
        let toolOk = false;
        let toolResult: ToolResult | undefined;
        const toolSpan = turn.span("tools.call");
        try {
          toolResult = await withTimeout(this.tools.call(out.tool, out.args), this.config.toolCallTimeoutMs, out.tool);
          toolOk = true;
          toolSpan.end({ ok: true, citations: toolResult.citations?.length ?? 0 });
        } catch (err) {
          toolSpan.end({ ok: false, error: String(err) });
          const ms = nowMs() - start;
          toolTrace.push({ tool: out.tool, ms, ok: false });
          turn.end("error", { tool: out.tool });
          const text = "Sorry — a tool failed while trying to help with that.";
          return AgentResultSchema.parse({ replyText: text, citations, toolTrace });
        }

        const ms = nowMs() - start;
        toolTrace.push({ tool: out.tool, ms, ok: toolOk });
        if (toolResult?.citations?.length) citations.push(...toolResult.citations);

        // Feed tool result back to the model and continue.
        messages.push({
          role: "tool",
          name: out.tool,
          content: toolResult?.content ?? ""
        });
      }
    } catch (err) {
      turn.end("error", { error: String(err) });
      const text = "Sorry — something went wrong while handling that message.";
      return AgentResultSchema.parse({ replyText: text, citations: [], toolTrace: toolTrace.length ? toolTrace : undefined });
    }
  }
}


