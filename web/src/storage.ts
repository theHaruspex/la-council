import type { UIMessage } from "./contracts";

const THREAD_ID_KEY = "la-council:web:threadId";
const MESSAGES_KEY = "la-council:web:messages";

function safeJsonParse<T>(raw: string | null): T | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function loadThreadId(): string {
  const existing = localStorage.getItem(THREAD_ID_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(THREAD_ID_KEY, id);
  return id;
}

export function rotateThreadId(): string {
  const id = crypto.randomUUID();
  localStorage.setItem(THREAD_ID_KEY, id);
  return id;
}

export function loadMessages(): UIMessage[] {
  const parsed = safeJsonParse<UIMessage[]>(localStorage.getItem(MESSAGES_KEY));
  return Array.isArray(parsed) ? parsed : [];
}

export function saveMessages(messages: UIMessage[]): void {
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
}

export function clearMessages(): void {
  localStorage.removeItem(MESSAGES_KEY);
}


