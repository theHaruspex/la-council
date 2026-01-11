import fastify, { type FastifyInstance } from "fastify";

import type { HttpEnv } from "../../config/env.js";
import { registerHttpRoutes } from "./routes.js";
import type { TurnEngine } from "./types.js";

export async function buildHttpServer(deps: { engine: TurnEngine; env: HttpEnv }): Promise<FastifyInstance> {
  const app = fastify();

  app.setErrorHandler((err, _req, reply) => {
    // If response already sent, just return.
    if (reply.sent) return;
    // Avoid leaking details.
    reply.code(500).send({ error: "internal_error" });
  });

  await registerHttpRoutes(app, { engine: deps.engine, token: deps.env.token });

  return app;
}

export async function startHttpServer(deps: { engine: TurnEngine; env: HttpEnv }): Promise<void> {
  const app = await buildHttpServer(deps);
  await app.listen({ host: deps.env.host, port: deps.env.port });
  console.log(`http host listening on http://${deps.env.host}:${deps.env.port}`);
}


