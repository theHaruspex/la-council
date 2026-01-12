import "dotenv/config";

import { createAgent } from "./app/createAgent.js";
import { loadHttpEnv } from "./app/config/env.js";
import { startHttpServer } from "./app/hosts/http/server.js";

const engine = createAgent();
const env = loadHttpEnv();

await startHttpServer({ engine, env });


