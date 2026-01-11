import type { FastifyInstance } from "fastify";

import { AgentResultSchema } from "../../../shared/agent.js";
import { HandoffEnvelopeSchema } from "../../../shared/handoff.js";
import { requireBearerToken } from "./auth.js";
import type { TurnEngine } from "./types.js";

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
      return reply.code(400).send({
        ...BAD_REQUEST,
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message
        }))
      });
    }

    const result = await deps.engine.handle(parsed.data);
    const validated = AgentResultSchema.parse(result);
    return reply.code(200).send(validated);
  });
}


