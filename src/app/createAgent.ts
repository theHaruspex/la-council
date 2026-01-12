import { AgentRuntime } from "../agent/runtime.js";
import type { StateMessage, StateStore } from "../agent/ports/state.js";
import type { ToolDefinition, ToolExecutor, ToolResult } from "../agent/ports/tools.js";
import type { Tracer, TurnHandle } from "../agent/ports/trace.js";

import { loadAgentEnv } from "./config/agentEnv.js";
import { createModel } from "./factories/createModel.js";

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
  const config = loadAgentEnv();
  const model = createModel(config.model);
  const tools = new NoopTools();
  const state = new MemoryStateStore();
  const tracer = new NoopTracer();

  return new AgentRuntime({ model, tools, state, tracer, config: config.runtime });
}


