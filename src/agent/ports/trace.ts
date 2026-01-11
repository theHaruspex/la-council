export type TurnStatus = "ok" | "error";

export type TurnMeta = {
  threadId: string;
  messageId: string;
  mode?: string;
};

export interface SpanHandle {
  end(data?: unknown): void;
}

export interface TurnHandle {
  span(name: string): SpanHandle;
  event(name: string, data?: unknown): void;
  end(status: TurnStatus, data?: unknown): void;
}

export interface Tracer {
  startTurn(meta: TurnMeta): TurnHandle;
}


