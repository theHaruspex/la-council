import type { ModelInput, ModelOutput, ModelPort } from "../../agent/ports/model.js";

const CANNED_PREFIX = "You said:";

export class CannedModel implements ModelPort {
  async generate(input: ModelInput): Promise<ModelOutput> {
    const lastUser = [...input.messages].reverse().find((m) => m.role === "user");
    const text = `${CANNED_PREFIX} ${lastUser?.content ?? ""}`.trim();
    return { type: "final", text };
  }
}


