import type { Citation } from "../../shared/citations.js";
import type { ToolDefinition, ToolExecutor, ToolResult } from "../ports/tools.js";

export type FakeToolsCall = { tool: string; args: unknown };

export class FakeTools implements ToolExecutor {
  public readonly calls: FakeToolsCall[] = [];

  private readonly defaultTitle = "Example (canned)";

  async listTools(): Promise<ToolDefinition[]> {
    return [
      {
        name: "web.open",
        description: "Open a URL and return a short cited summary.",
        inputSchema: {
          type: "object",
          properties: { url: { type: "string" } },
          required: ["url"]
        }
      }
    ];
  }

  async call(tool: string, args: unknown): Promise<ToolResult> {
    this.calls.push({ tool, args });
    if (tool !== "web.open") {
      return { content: `Unknown tool: ${tool}` };
    }
    const url =
      typeof (args as { url?: unknown } | null)?.url === "string"
        ? ((args as { url: string }).url as string)
        : "https://example.com/la-council";
    return {
      content: "CANNED_WEB_CONTENT: Los Angeles City Council context (placeholder).",
      citations: [{ url, title: this.defaultTitle }]
    };
  }
}


