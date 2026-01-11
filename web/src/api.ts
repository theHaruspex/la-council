import type { AgentResult, HandoffEnvelope } from "./contracts";

const TURN_PATH = "/turn";
const HTTP_TOKEN = import.meta.env.VITE_HTTP_TOKEN as string | undefined;

function getAuthHeader(): Record<string, string> {
  const token = HTTP_TOKEN?.trim();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function readErrorMessage(res: Response): Promise<string> {
  const textFallback = `${res.status} ${res.statusText}`.trim();
  try {
    const data = (await res.json()) as any;
    if (typeof data?.error === "string") return data.error;
    if (Array.isArray(data?.issues) && data.issues[0]?.message) return String(data.issues[0].message);
    return textFallback;
  } catch {
    return textFallback;
  }
}

export async function sendTurn(args: { threadId: string; userText: string }): Promise<AgentResult> {
  const envelope: HandoffEnvelope = {
    threadId: args.threadId,
    messageId: crypto.randomUUID(),
    userText: args.userText,
    timestamp: new Date().toISOString(),
    mode: "web"
  };

  const res = await fetch(TURN_PATH, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...getAuthHeader()
    },
    body: JSON.stringify(envelope)
  });

  if (!res.ok) {
    const msg = await readErrorMessage(res);
    throw new Error(msg);
  }

  const data = (await res.json()) as AgentResult;
  return data;
}


