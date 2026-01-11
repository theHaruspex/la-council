export type HttpEnv = {
  host: string;
  port: number;
  token?: string;
};

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8787;

function parsePort(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n)) return undefined;
  if (n <= 0 || n > 65535) return undefined;
  return n;
}

export function loadHttpEnv(): HttpEnv {
  const host = process.env.HTTP_HOST?.trim() || DEFAULT_HOST;
  const port = parsePort(process.env.HTTP_PORT) ?? DEFAULT_PORT;
  const tokenRaw = process.env.HTTP_TOKEN?.trim();
  const token = tokenRaw ? tokenRaw : undefined;

  return { host, port, token };
}


