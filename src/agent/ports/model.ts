import type { ToolDefinition } from "./tools.js";

export type ModelMessage = {
  role: "user" | "assistant" | "tool";
  content: string;
  name?: string;
};

export type ModelInput = {
  system: string;
  messages: ModelMessage[];
  tools?: ToolDefinition[];
};

export type ModelOutput =
  | { type: "final"; text: string }
  | { type: "tool_call"; tool: string; args: unknown };

export interface ModelPort {
  generate(input: ModelInput): Promise<ModelOutput>;
}


