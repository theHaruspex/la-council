import { describe, expect, it, vi } from "vitest";

import { OpenAIModel } from "../openaiModel.js";

const API_KEY = "test-key";
const MODEL = "gpt-test";

function makeClient(createImpl: any) {
  return { chat: { completions: { create: vi.fn(createImpl) } } };
}

describe("OpenAIModel", () => {
  it("final text path", async () => {
    const client = makeClient(async () => ({
      choices: [{ message: { content: "hi", tool_calls: null } }]
    }));

    const model = new OpenAIModel({ apiKey: API_KEY, model: MODEL, client });
    const out = await model.generate({ system: "sys", messages: [] });

    expect(out).toEqual({ type: "final", text: "hi" });
  });

  it("tool_calls path (single)", async () => {
    const client = makeClient(async () => ({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                id: "call-1",
                function: { name: "web.open", arguments: "{\"url\":\"https://example.com\"}" }
              }
            ]
          }
        }
      ]
    }));

    const model = new OpenAIModel({ apiKey: API_KEY, model: MODEL, client });
    const out = await model.generate({ system: "sys", messages: [], tools: [] });

    expect(out.type).toBe("tool_calls");
    if (out.type !== "tool_calls") throw new Error("expected tool_calls");
    expect(out.calls).toEqual([{ id: "call-1", tool: "web.open", args: { url: "https://example.com" } }]);
  });

  it("tool_calls path (multiple)", async () => {
    const client = makeClient(async () => ({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                id: "call-a",
                function: { name: "web.open", arguments: "{\"url\":\"https://example.com/a\"}" }
              },
              {
                id: "call-b",
                function: { name: "web.open", arguments: "{\"url\":\"https://example.com/b\"}" }
              }
            ]
          }
        }
      ]
    }));

    const model = new OpenAIModel({ apiKey: API_KEY, model: MODEL, client });
    const out = await model.generate({ system: "sys", messages: [] });

    expect(out.type).toBe("tool_calls");
    if (out.type !== "tool_calls") throw new Error("expected tool_calls");
    expect(out.calls).toEqual([
      { id: "call-a", tool: "web.open", args: { url: "https://example.com/a" } },
      { id: "call-b", tool: "web.open", args: { url: "https://example.com/b" } }
    ]);
  });

  it("tool arguments JSON parse failure returns raw string", async () => {
    const client = makeClient(async () => ({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [{ id: "call-1", function: { name: "web.open", arguments: "not json" } }]
          }
        }
      ]
    }));

    const model = new OpenAIModel({ apiKey: API_KEY, model: MODEL, client });
    const out = await model.generate({ system: "sys", messages: [] });

    expect(out.type).toBe("tool_calls");
    if (out.type !== "tool_calls") throw new Error("expected tool_calls");
    expect(out.calls[0]?.args).toBe("not json");
  });
});


