import type { ModelInput, ModelOutput, ModelPort } from "../ports/model.js";

export class MockModel implements ModelPort {
  public readonly calls: ModelInput[] = [];
  private readonly outputs: ModelOutput[];

  constructor(outputs: ModelOutput[]) {
    this.outputs = [...outputs];
  }

  async generate(input: ModelInput): Promise<ModelOutput> {
    this.calls.push(input);
    const next = this.outputs.shift();
    if (!next) {
      throw new Error("MockModel: no more scripted outputs");
    }
    return next;
  }
}


