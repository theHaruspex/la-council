import type { ModelPort } from "../../agent/ports/model.js";
import type { AgentEnv } from "../config/agentEnv.js";
import { CannedModel } from "../models/cannedModel.js";
import { OpenAIModel } from "../models/openaiModel.js";

const OPENAI_API_KEY_REQUIRED = "OPENAI_API_KEY is required when AGENT_MODEL_PROVIDER=openai";
const OPENAI_MODEL_REQUIRED = "AGENT_MODEL_NAME is required when AGENT_MODEL_PROVIDER=openai";

export function createModel(config: AgentEnv["model"]): ModelPort {
  if (config.provider === "canned") return new CannedModel();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error(OPENAI_API_KEY_REQUIRED);
  const model = config.name?.trim();
  if (!model) throw new Error(OPENAI_MODEL_REQUIRED);
  return new OpenAIModel({ apiKey, model });
}


