import type { StateMessage, StateStore } from "../ports/state.js";

export class MemoryStateStore implements StateStore {
  private readonly byThread = new Map<string, StateMessage[]>();

  async load(threadId: string): Promise<StateMessage[]> {
    return [...(this.byThread.get(threadId) ?? [])];
  }

  async append(threadId: string, item: StateMessage): Promise<void> {
    const arr = this.byThread.get(threadId) ?? [];
    arr.push(item);
    this.byThread.set(threadId, arr);
  }
}


