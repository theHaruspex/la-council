import type { ModelPort } from "../../agent/ports/model.js";
import type { AgentEnv } from "../config/agentEnv.js";
import { CannedModel } from "../models/cannedModel.js";

const OPENAI_NOT_IMPLEMENTED = "Model provider 'openai' is configured but not implemented yet.";

export function createModel(config: AgentEnv["model"]): ModelPort {
  if (config.provider === "canned") return new CannedModel();
  throw new Error(OPENAI_NOT_IMPLEMENTED);
}


