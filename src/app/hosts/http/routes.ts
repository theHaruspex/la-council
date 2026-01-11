import type { FastifyInstance } from "fastify";

import { AgentResultSchema } from "../../../shared/agent.js";
import { HandoffEnvelopeSchema } from "../../../shared/handoff.js";
import { requireBearerToken } from "./auth.js";

export type TurnEngine = {
  handle(
    envelope: import("../../../shared/handoff.js").HandoffEnvelope
  ): Promise<import("../../../shared/agent.js").AgentResult>;
};

type RegisterDeps = { engine: TurnEngine; token?: string };

const BAD_REQUEST = { error: "bad_request" } as const;

export async function registerHttpRoutes(app: FastifyInstance, deps: RegisterDeps): Promise<void> {
  const auth = requireBearerToken(deps.token);

  app.get("/healthz", async () => {
    return { ok: true };
  });

  app.post("/turn", { preHandler: auth }, async (req, reply) => {
    const parsed = HandoffEnvelopeSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send({
        ...BAD_REQUEST,
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message
        }))
      });
      return;
    }

    const result = await deps.engine.handle(parsed.data);
    const validated = AgentResultSchema.parse(result);
    reply.code(200).send(validated);
  });
}


