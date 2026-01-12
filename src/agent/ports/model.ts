import type { ToolDefinition } from "./tools.js";

export type ToolCall = { id?: string; tool: string; args: unknown };

export type ModelMessage = {
  role: "user" | "assistant" | "tool";
  content: string;
  name?: string;
  toolCallId?: string;
};

export type ModelInput = {
  system: string;
  messages: ModelMessage[];
  tools?: ToolDefinition[];
};

export type ModelOutput =
  | { type: "final"; text: string }
  | { type: "tool_calls"; calls: ToolCall[] };

export interface ModelPort {
  generate(input: ModelInput): Promise<ModelOutput>;
}


