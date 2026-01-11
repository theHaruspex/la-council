import { useCallback } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  canSend: boolean;
  isSending: boolean;
};

const HELPER_TEXT = "Enter to send • Shift+Enter for newline";

export function Composer(props: Props) {
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (props.canSend) props.onSend();
      }
    },
    [props]
  );

  return (
    <div className="composer">
      <textarea
        className="composer__input"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Type a message…"
        rows={2}
        disabled={props.isSending}
      />
      <div className="composer__row">
        <div className="composer__helper">{HELPER_TEXT}</div>
        <button className="composer__send" onClick={props.onSend} disabled={!props.canSend}>
          Send
        </button>
      </div>
    </div>
  );
}


