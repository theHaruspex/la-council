import type { Citation } from "../../shared/citations.js";

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: unknown;
};

export type ToolResult = {
  content: string;
  citations?: Citation[];
};

export interface ToolExecutor {
  listTools(mode?: string): Promise<ToolDefinition[]>;
  call(tool: string, args: unknown): Promise<ToolResult>;
}


