export type StateMessage = {
  role: "user" | "assistant";
  content: string;
};

export interface StateStore {
  load(threadId: string): Promise<StateMessage[]>;
  append(threadId: string, item: StateMessage): Promise<void>;
}


