export type ModelProvider = "canned" | "openai";

export type AgentEnv = {
  model: {
    provider: ModelProvider;
    name?: string;
  };
  runtime: {
    maxToolCallsPerTurn: number;
    toolCallTimeoutMs: number;
  };
};

const DEFAULT_PROVIDER: ModelProvider = "canned";
const DEFAULT_MAX_TOOL_CALLS_PER_TURN = 3;
const DEFAULT_TOOL_CALL_TIMEOUT_MS = 5_000;

const ENV_MODEL_PROVIDER = "AGENT_MODEL_PROVIDER";
const ENV_MODEL_NAME = "AGENT_MODEL_NAME";
const ENV_MAX_TOOL_CALLS = "AGENT_MAX_TOOL_CALLS_PER_TURN";
const ENV_TOOL_TIMEOUT_MS = "AGENT_TOOL_CALL_TIMEOUT_MS";

function parseIntSafe(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function parseModelProvider(value: string | undefined): ModelProvider {
  const v = value?.trim().toLowerCase();
  if (v === "canned" || v === "openai") return v;
  return DEFAULT_PROVIDER;
}

export function loadAgentEnv(): AgentEnv {
  const provider = parseModelProvider(process.env[ENV_MODEL_PROVIDER]);
  const nameRaw = process.env[ENV_MODEL_NAME]?.trim();
  const name = nameRaw ? nameRaw : undefined;

  const maxToolCallsPerTurn =
    parseIntSafe(process.env[ENV_MAX_TOOL_CALLS]) ?? DEFAULT_MAX_TOOL_CALLS_PER_TURN;
  const toolCallTimeoutMs = parseIntSafe(process.env[ENV_TOOL_TIMEOUT_MS]) ?? DEFAULT_TOOL_CALL_TIMEOUT_MS;

  return {
    model: { provider, name },
    runtime: { maxToolCallsPerTurn, toolCallTimeoutMs }
  };
}


