import { AgentRuntime } from "../agent/runtime.js";
import type { ModelInput, ModelOutput, ModelPort } from "../agent/ports/model.js";
import type { StateMessage, StateStore } from "../agent/ports/state.js";
import type { ToolDefinition, ToolExecutor, ToolResult } from "../agent/ports/tools.js";
import type { Tracer, TurnHandle } from "../agent/ports/trace.js";

const CANNED_PREFIX = "You said:";

class CannedModel implements ModelPort {
  async generate(input: ModelInput): Promise<ModelOutput> {
    const lastUser = [...input.messages].reverse().find((m) => m.role === "user");
    const text = `${CANNED_PREFIX} ${lastUser?.content ?? ""}`.trim();
    return { type: "final", text };
  }
}

class NoopTools implements ToolExecutor {
  async listTools(): Promise<ToolDefinition[]> {
    return [];
  }

  async call(_tool: string, _args: unknown): Promise<ToolResult> {
    return { content: "" };
  }
}

class MemoryStateStore implements StateStore {
  private readonly byThread = new Map<string, StateMessage[]>();

  async load(threadId: string): Promise<StateMessage[]> {
    return [...(this.byThread.get(threadId) ?? [])];
  }

  async append(threadId: string, item: StateMessage): Promise<void> {
    const arr = this.byThread.get(threadId) ?? [];
    arr.push(item);
    this.byThread.set(threadId, arr);
  }
}

const noopTurn: TurnHandle = {
  span: () => ({ end: () => {} }),
  event: () => {},
  end: () => {}
};
class NoopTracer implements Tracer {
  startTurn(): TurnHandle {
    return noopTurn;
  }
}

export function createAgent(): AgentRuntime {
  const model = new CannedModel();
  const tools = new NoopTools();
  const state = new MemoryStateStore();
  const tracer = new NoopTracer();

  return new AgentRuntime({ model, tools, state, tracer });
}


