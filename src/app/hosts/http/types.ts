export type TurnEngine = {
  handle(
    envelope: import("../../../shared/handoff.js").HandoffEnvelope
  ): Promise<import("../../../shared/agent.js").AgentResult>;
};


