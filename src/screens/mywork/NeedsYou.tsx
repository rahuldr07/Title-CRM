import { useEffect, useRef, useState } from 'react'
import { Avatar, Btn, Chip, Rows } from '@/components/ui'
import { UPDKIND } from '@/data/production'
import { personById, whoName } from '@/lib/permissions'
import { fmtDate } from '@/lib/format'
import { fromYourDepartment, useUpdates } from '@/state/updates'
import {
  conversations,
  markRead,
  sendMessage,
  threadWith,
  unreadFrom,
  useChats,
} from '@/state/chats'
import type { Person, Update } from '@/data/types'

function UnreadDot({ n }: { n: number }) {
  return n ? (
    <span className="bdg chat-unread" aria-label={`${n} unread`}>
      {n}
    </span>
  ) : null
}

/**
 * "Needs you" on My work: the department's updates, and the conversations they
 * start. Opening an update opens a chat with the person who wrote it, so a
 * question about a handover goes to the one person who can answer it rather
 * than into another update everybody reads.
 */
export function NeedsYou({ me }: { me: Person }) {
  const chats = useChats()
  const updates = fromYourDepartment(useUpdates(), me)
  const [withId, setWithId] = useState<string | null>(null)

  if (withId) {
    return (
      <Chat
        me={me}
        other={withId}
        context={updates.filter((u) => u.who === withId).slice(0, 1)}
        onBack={() => setWithId(null)}
      />
    )
  }

  const talks = conversations(chats, me.id)

  return (
    <>
      {talks.length ? (
        <>
          <div className="lb">Messages</div>
          <Rows bare style={{ marginBottom: 16 }}>
            {talks.map((c) => (
              <button
                key={c.other}
                type="button"
                className="rw tagged"
                style={{ width: '100%', textAlign: 'left' }}
                onClick={() => setWithId(c.other)}
              >
                <span>
                  <Avatar name={whoName(c.other)} />
                </span>
                <span>
                  <b style={{ fontSize: 'var(--t-body)' }}>{whoName(c.other)}</b>
                  <div className="sd chat-last">
                    {c.last.from === me.id ? 'You: ' : ''}
                    {c.last.b}
                  </div>
                </span>
                <span>
                  <UnreadDot n={c.unread} />
                </span>
              </button>
            ))}
          </Rows>
        </>
      ) : null}

      <div className="lb">From your department</div>
      {updates.length ? (
        <Rows bare>
          {updates.map((u) => (
            <button
              key={u.id}
              type="button"
              className="rw tagged"
              style={{ width: '100%', textAlign: 'left' }}
              title={`Chat with ${whoName(u.who)}`}
              onClick={() => setWithId(u.who)}
            >
              <span>
                <Chip kind={UPDKIND[u.kind] ?? 'n'}>{u.kind}</Chip>
              </span>
              <span>
                <b style={{ fontSize: 'var(--t-body)' }}>{whoName(u.who)}</b>
                <div className="sd">{u.b}</div>
                <div className="sd gr">{fmtDate(u.d)}</div>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UnreadDot n={unreadFrom(chats, me.id, u.who)} />
                <span className="chat-go">Chat →</span>
              </span>
            </button>
          ))}
        </Rows>
      ) : (
        <p className="gr" style={{ fontSize: 'var(--t-body)', margin: 0 }}>
          Nothing from the rest of {me.dep[0] || 'your department'} recently.
        </p>
      )}
    </>
  )
}

function Chat({
  me,
  other,
  context,
  onBack,
}: {
  me: Person
  other: string
  context: Update[]
  onBack: () => void
}) {
  const chats = useChats()
  const thread = threadWith(chats, me.id, other)
  const person = personById(other)
  const first = (person?.n ?? 'them').split(' ')[0]
  const [draft, setDraft] = useState('')
  const log = useRef<HTMLDivElement>(null)

  /* Reading the thread is what clears its count on "Needs you", including a
     message that arrives while it is open. */
  useEffect(() => {
    markRead(me.id, other)
    /* Scroll the thread, not the page: scrollIntoView would also move the
       document behind the modal. */
    if (log.current) log.current.scrollTop = log.current.scrollHeight
  }, [me.id, other, thread.length])

  const send = () => {
    if (sendMessage(me.id, other, draft)) setDraft('')
  }

  return (
    <>
      <div className="chat-head">
        <Btn variant="ghost" small onClick={onBack}>
          ← Back
        </Btn>
        <Avatar name={person?.n ?? null} />
        <span style={{ minWidth: 0 }}>
          <b style={{ fontSize: 'var(--t-body)' }}>{person?.n ?? 'Unknown person'}</b>
          <div className="chat-sub">{person?.dep.join(', ') || 'No department'}</div>
        </span>
      </div>

      <div ref={log} className="chat-thread" role="log" aria-live="polite" aria-label={`Chat with ${first}`}>
        {context.map((u) => (
          <div key={u.id} className="chat-context">
            <Chip kind={UPDKIND[u.kind] ?? 'n'}>{u.kind}</Chip>
            <span>{u.b}</span>
          </div>
        ))}
        {thread.length ? (
          thread.map((m) => (
            <div key={m.seq} className={`chat-msg ${m.from === me.id ? 'me' : 'them'}`}>
              {m.b}
            </div>
          ))
        ) : (
          <p className="chat-empty">No messages yet. Say hello to {first}.</p>
        )}
      </div>

      <div className="chat-compose">
        <textarea
          className="inp"
          rows={2}
          aria-label={`Message ${first}`}
          placeholder={`Message ${first}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              send()
            }
          }}
        />
        <Btn onClick={send} disabled={!draft.trim()}>
          Send
        </Btn>
      </div>
    </>
  )
}
