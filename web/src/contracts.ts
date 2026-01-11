export type Citation = {
  url: string;
  title?: string;
  retrievedAt?: string;
  excerpt?: string;
};

export type AgentResult = {
  replyText: string;
  citations: Citation[];
  toolTrace?: Array<{ tool: string; ms: number; ok: boolean }>;
  debug?: Record<string, unknown>;
};

export type HandoffEnvelope = {
  threadId: string;
  messageId: string;
  userText: string;
  timestamp: string;
  mode?: "mvp" | "web";
  metadata?: Record<string, unknown>;
};

export type UIMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  citations?: Citation[];
};


