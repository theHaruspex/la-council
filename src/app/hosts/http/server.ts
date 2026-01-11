import fastify, { type FastifyInstance } from "fastify";

import type { HttpEnv } from "../../config/env.js";
import { registerHttpRoutes, type TurnEngine } from "./routes.js";

export function buildHttpServer(deps: { engine: TurnEngine; env: HttpEnv }): FastifyInstance {
  const app = fastify();

  app.register(async (instance) => {
    await registerHttpRoutes(instance, { engine: deps.engine, token: deps.env.token });
  });

  return app;
}

export async function startHttpServer(deps: { engine: TurnEngine; env: HttpEnv }): Promise<void> {
  const app = buildHttpServer(deps);
  await app.listen({ host: deps.env.host, port: deps.env.port });
  console.log(`http host listening on http://${deps.env.host}:${deps.env.port}`);
}


