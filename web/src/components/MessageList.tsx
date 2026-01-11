import type { UIMessage } from "../contracts";

type Props = {
  messages: UIMessage[];
};

const ROLE_CLASS: Record<UIMessage["role"], string> = {
  user: "msg msg--user",
  assistant: "msg msg--assistant"
};

export function MessageList(props: Props) {
  return (
    <div className="messages">
      {props.messages.map((m) => (
        <div key={m.id} className={ROLE_CLASS[m.role]}>
          <div className="msg__bubble">
            <div className="msg__text">{m.text}</div>
            {m.role === "assistant" && m.citations?.length ? (
              <div className="msg__citations">
                <div className="msg__citationsTitle">Citations</div>
                <ul className="msg__citationsList">
                  {m.citations.map((c) => (
                    <li key={c.url} className="msg__citationItem">
                      <a className="msg__citationLink" href={c.url} target="_blank" rel="noreferrer">
                        {c.title ? c.title : c.url}
                      </a>
                      {c.title ? <span className="msg__citationUrl">{c.url}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}


