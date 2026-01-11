import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";

const AUTH_HEADER = "authorization";

export function requireBearerToken(token?: string): preHandlerHookHandler {
  if (!token) {
    return async function allowAll() {
      // no auth
    };
  }

  const expected = `Bearer ${token}`;

  return async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
    const got = req.headers[AUTH_HEADER] as string | undefined;
    if (got !== expected) {
      return reply.code(401).send({ error: "unauthorized" });
    }
  };
}


