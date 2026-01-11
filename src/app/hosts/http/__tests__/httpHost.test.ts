import { describe, expect, it } from "vitest";

import { buildHttpServer } from "../server.js";
import type { TurnEngine } from "../routes.js";

const engine: TurnEngine = {
  handle: async () => ({ replyText: "ok", citations: [] })
};

const env = { host: "127.0.0.1", port: 0, token: "secret" };

describe("http host", () => {
  it("GET /healthz returns ok", async () => {
    const app = buildHttpServer({ engine, env });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/healthz" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    await app.close();
  });

  it("POST /turn with valid envelope returns AgentResult", async () => {
    const app = buildHttpServer({ engine, env });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/turn",
      headers: { authorization: "Bearer secret" },
      payload: {
        threadId: "t-1",
        messageId: "m-1",
        userText: "hello",
        timestamp: new Date().toISOString(),
        mode: "web"
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ replyText: "ok", citations: [] });

    await app.close();
  });

  it("POST /turn missing fields returns 400", async () => {
    const app = buildHttpServer({ engine, env });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/turn",
      headers: { authorization: "Bearer secret" },
      payload: { threadId: "t-1" }
    });

    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it("auth is enforced when token is set", async () => {
    const app = buildHttpServer({ engine, env });
    await app.ready();

    const missing = await app.inject({
      method: "POST",
      url: "/turn",
      payload: {
        threadId: "t-1",
        messageId: "m-1",
        userText: "hello",
        timestamp: new Date().toISOString(),
        mode: "web"
      }
    });
    expect(missing.statusCode).toBe(401);

    const ok = await app.inject({
      method: "POST",
      url: "/turn",
      headers: { authorization: "Bearer secret" },
      payload: {
        threadId: "t-1",
        messageId: "m-1",
        userText: "hello",
        timestamp: new Date().toISOString(),
        mode: "web"
      }
    });
    expect(ok.statusCode).toBe(200);

    await app.close();
  });
});


