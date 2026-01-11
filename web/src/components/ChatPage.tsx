import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { UIMessage } from "../contracts";
import { sendTurn } from "../api";
import { clearMessages, loadMessages, loadThreadId, rotateThreadId, saveMessages } from "../storage";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";

const APP_TITLE = "LA Council Assistant (MVP)";
const NEAR_BOTTOM_PX = 50;

function nowIso(): string {
  return new Date().toISOString();
}

export function ChatPage() {
  const [threadId, setThreadId] = useState<string>(() => loadThreadId());
  const [messages, setMessages] = useState<UIMessage[]>(() => loadMessages());
  const [input, setInput] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const nearBottomRef = useRef<boolean>(true);

  const canSend = useMemo(() => !isSending && input.trim().length > 0, [input, isSending]);

  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  const updateNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    nearBottomRef.current = distance <= NEAR_BOTTOM_PX;
  }, []);

  useEffect(() => {
    updateNearBottom();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateNearBottom, { passive: true });
    return () => el.removeEventListener("scroll", updateNearBottom);
  }, [updateNearBottom]);

  useEffect(() => {
    if (!nearBottomRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const onPurge = useCallback(() => {
    clearMessages();
    setMessages([]);
    setThreadId(rotateThreadId());
    setError(null);
  }, []);

  const onSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setError(null);

    const userMsg: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      createdAt: nowIso()
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const result = await sendTurn({ threadId, userText: text });
      const assistantMsg: UIMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: result.replyText,
        createdAt: nowIso(),
        citations: result.citations
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, threadId]);

  return (
    <div className="page">
      <header className="header">
        <div className="header__title">
          <div className="header__app">{APP_TITLE}</div>
          <div className="header__meta">Thread: {threadId}</div>
        </div>
        <div className="header__actions">
          <button className="header__purge" onClick={onPurge} disabled={isSending}>
            Purge history
          </button>
        </div>
      </header>

      <main className="main">
        {error ? <div className="error">Error: {error}</div> : null}
        {isSending ? <div className="sending">Sending…</div> : null}
        <div className="scroll" ref={scrollRef}>
          <MessageList messages={messages} />
          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="footer">
        <Composer value={input} onChange={setInput} onSend={onSend} canSend={canSend} isSending={isSending} />
      </footer>
    </div>
  );
}


