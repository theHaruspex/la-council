export function isToolAllowed(tool: string): boolean {
  // Hard allowlist (agent-side). Global orchestrator remains pure.
  return tool === "web.open";
}


