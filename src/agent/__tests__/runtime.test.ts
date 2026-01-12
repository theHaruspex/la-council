import { describe, expect, it } from "vitest";

import type { Tracer, TurnHandle } from "../ports/trace.js";
import { AgentRuntime } from "../runtime.js";
import { FakeTools } from "../mocks/fakeTools.js";
import { MemoryStateStore } from "../mocks/memoryState.js";
import { MockModel } from "../mocks/mockModel.js";

const noopTurn: TurnHandle = {
  span: () => ({ end: () => {} }),
  event: () => {},
  end: () => {}
};
const noopTracer: Tracer = { startTurn: () => noopTurn };

function envelope(overrides?: Partial<{ mode: "mvp" | "web" }>) {
  return {
    threadId: "t-1",
    messageId: "m-1",
    userText: "hello",
    timestamp: new Date().toISOString(),
    ...(overrides ?? {})
  };
}

describe("AgentRuntime", () => {
  it("final response, no tools", async () => {
    const model = new MockModel([{ type: "final", text: "ok" }]);
    const tools = new FakeTools();
    const state = new MemoryStateStore();

    const agent = new AgentRuntime({ model, tools, state, tracer: noopTracer });
    const result = await agent.handle(envelope());

    expect(result.replyText).toBe("ok");
    expect(result.citations).toEqual([]);
    expect(result.toolTrace).toBeUndefined();

    const saved = await state.load("t-1");
    expect(saved).toEqual([
      { role: "user", content: "hello" },
      { role: "assistant", content: "ok" }
    ]);
  });

  it("single tool call then final", async () => {
    const model = new MockModel([
      { type: "tool_calls", calls: [{ tool: "web.open", args: { url: "https://example.com" } }] },
      { type: "final", text: "here you go" }
    ]);
    const tools = new FakeTools();
    const state = new MemoryStateStore();

    const agent = new AgentRuntime({ model, tools, state, tracer: noopTracer });
    const result = await agent.handle(envelope({ mode: "web" }));

    expect(tools.calls).toHaveLength(1);
    expect(tools.calls[0]?.tool).toBe("web.open");

    expect(result.replyText).toBe("here you go");
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]?.url).toContain("example.com");
    expect(result.toolTrace).toHaveLength(1);
    expect(result.toolTrace?.[0]?.ok).toBe(true);
  });

  it("multiple tool calls in one model step then final", async () => {
    const model = new MockModel([
      {
        type: "tool_calls",
        calls: [
          { tool: "web.open", args: { url: "https://example.com/a" }, id: "call-a" },
          { tool: "web.open", args: { url: "https://example.com/b" }, id: "call-b" }
        ]
      },
      { type: "final", text: "done" }
    ]);
    const tools = new FakeTools();
    const state = new MemoryStateStore();

    const agent = new AgentRuntime({ model, tools, state, tracer: noopTracer });
    const result = await agent.handle(envelope({ mode: "web" }));

    expect(tools.calls).toHaveLength(2);
    expect(result.replyText).toBe("done");
    expect(result.toolTrace).toHaveLength(2);
    expect(result.citations).toHaveLength(2);
  });

  it("disallowed tool is blocked", async () => {
    const model = new MockModel([{ type: "tool_calls", calls: [{ tool: "email.send", args: { to: "x@y.com" } }] }]);
    const tools = new FakeTools();
    const state = new MemoryStateStore();

    const agent = new AgentRuntime({ model, tools, state, tracer: noopTracer });
    const result = await agent.handle(envelope({ mode: "web" }));

    expect(tools.calls).toHaveLength(0);
    expect(result.replyText.toLowerCase()).toContain("isn't enabled");
    expect(result.citations).toEqual([]);
  });

  it("maxToolCallsPerTurn caps multi-call batches", async () => {
    const model = new MockModel([
      {
        type: "tool_calls",
        calls: [
          { tool: "web.open", args: { url: "https://example.com/a" } },
          { tool: "web.open", args: { url: "https://example.com/b" } }
        ]
      }
    ]);
    const tools = new FakeTools();
    const state = new MemoryStateStore();

    const agent = new AgentRuntime({
      model,
      tools,
      state,
      tracer: noopTracer,
      config: { maxToolCallsPerTurn: 1 }
    });
    const result = await agent.handle(envelope({ mode: "web" }));

    expect(tools.calls).toHaveLength(0);
    expect(result.replyText.toLowerCase()).toContain("maximum number of tool calls");
  });
});


