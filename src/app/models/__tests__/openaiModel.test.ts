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
    expect(out.assistantMessage.role).toBe("assistant");
    expect(out.assistantMessage.content).toBe("");
    expect(out.assistantMessage.toolCalls).toEqual(out.calls);
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
    expect(out.assistantMessage.role).toBe("assistant");
    expect(out.assistantMessage.content).toBe("");
    expect(out.assistantMessage.toolCalls).toEqual(out.calls);
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
    expect(out.assistantMessage.role).toBe("assistant");
    expect(out.assistantMessage.content).toBe("");
    expect(out.assistantMessage.toolCalls).toEqual(out.calls);
  });

  it("outbound mapping includes assistant tool_calls when toolCalls are present", async () => {
    const client = makeClient(async () => ({
      choices: [{ message: { content: "ok", tool_calls: null } }]
    }));

    const model = new OpenAIModel({ apiKey: API_KEY, model: MODEL, client });
    await model.generate({
      system: "sys",
      messages: [
        {
          role: "assistant",
          content: "",
          toolCalls: [{ id: "call-1", tool: "web.open", args: { url: "https://x.com" } }]
        }
      ],
      tools: [{ name: "web.open", description: "open", inputSchema: { type: "object", properties: {} } }]
    });

    expect(client.chat.completions.create).toHaveBeenCalledTimes(1);
    const req = client.chat.completions.create.mock.calls[0]?.[0] as any;
    const assistant = (req?.messages as any[])?.find((m) => m.role === "assistant");
    expect(assistant.tool_calls).toBeTruthy();
    expect(assistant.tool_calls[0]?.id).toBe("call-1");
    expect(assistant.tool_calls[0]?.function?.name).toBe("web.open");
    expect(typeof assistant.tool_calls[0]?.function?.arguments).toBe("string");
  });
});


