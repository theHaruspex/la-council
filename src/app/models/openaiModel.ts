import OpenAI from "openai";

import type { ModelInput, ModelOutput, ModelPort, ToolCall } from "../../agent/ports/model.js";
import type { ToolDefinition } from "../../agent/ports/tools.js";

const DEFAULT_TOOL_PARAMS = { type: "object", properties: {} } as const;
const ROLE_DEVELOPER = "developer";
const ASSISTANT_ROLE = "assistant";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function mapTools(tools: ToolDefinition[] | undefined): Array<{ type: "function"; function: any }> | undefined {
  if (!tools?.length) return undefined;
  return tools.map((t) => {
    const parameters = isPlainObject(t.inputSchema) ? t.inputSchema : DEFAULT_TOOL_PARAMS;
    return {
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters
      }
    };
  });
}

export class OpenAIModel implements ModelPort {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly client: any;

  constructor(opts: { apiKey: string; model: string; client?: any }) {
    this.apiKey = opts.apiKey;
    this.model = opts.model;
    this.client = opts.client ?? new OpenAI({ apiKey: this.apiKey });
  }

  async generate(input: ModelInput): Promise<ModelOutput> {
    const tools = mapTools(input.tools);
    const hasTools = Boolean(tools?.length);

    const messages: any[] = [
      { role: ROLE_DEVELOPER, content: input.system },
      ...input.messages.map((m) => {
        if (m.role === "tool") {
          const toolMsg: any = { role: "tool", content: m.content };
          if (m.name) toolMsg.name = m.name;
          if (m.toolCallId) toolMsg.tool_call_id = m.toolCallId;
          return toolMsg;
        }
        if (m.role === ASSISTANT_ROLE && m.toolCalls?.length) {
          const tool_calls = m.toolCalls.map((c) => ({
            id: c.id,
            type: "function",
            function: { name: c.tool, arguments: JSON.stringify(c.args ?? {}) }
          }));
          return {
            role: ASSISTANT_ROLE,
            content: m.content === "" ? null : m.content,
            tool_calls
          };
        }
        return { role: m.role, content: m.content };
      })
    ];

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages,
      tools,
      tool_choice: hasTools ? "auto" : undefined,
      parallel_tool_calls: hasTools ? true : undefined
    });

    const choice = completion?.choices?.[0];
    const msg = choice?.message;
    const toolCalls = msg?.tool_calls;

    if (Array.isArray(toolCalls) && toolCalls.length > 0) {
      const calls: ToolCall[] = toolCalls.map((tc: any) => {
        const id = tc?.id as string | undefined;
        const tool = tc?.function?.name as string;
        const rawArgs = tc?.function?.arguments as string | undefined;
        let args: unknown = rawArgs ?? {};
        if (typeof rawArgs === "string") {
          try {
            args = JSON.parse(rawArgs);
          } catch {
            args = rawArgs;
          }
        }
        return { id, tool, args };
      });
      return {
        type: "tool_calls",
        calls,
        assistantMessage: {
          role: ASSISTANT_ROLE,
          content: ((msg?.content as string | null | undefined) ?? "") || "",
          toolCalls: calls
        }
      };
    }

    const text = (msg?.content as string | null | undefined) ?? "";
    return { type: "final", text };
  }
}


