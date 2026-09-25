import { useStageName } from '@/domain/company/naming'
import { useEffect, useRef, useState } from 'react'
import { Avatar } from '@/shared/ui/Avatar'
import { Btn, Press } from '@/shared/ui/Button'
import { Textarea } from '@/shared/ui/Controls'
import { Chip } from '@/shared/ui/Chip'
import { Rows } from '@/shared/ui/DetailList'
import { UPDKIND } from '@/data/production'
import { personById, whoName } from '@/domain/people/roster'
import { fmtDate } from '@/shared/lib/format'
import { fromYourDepartment, useUpdates } from './updates'
import {
  conversations,
  markRead,
  sendMessage,
  threadWith,
  unreadFrom,
  useChats,
} from './chats'
import type { Person, Update } from '@/data/types'
import { Note } from '@/shared/ui/Layout'

function UnreadDot({ n }: { n: number }) {
  return n ? (
    <span className="bdg chat-unread" aria-label={`${n} unread`}>
      {n}
    </span>
  ) : null
}

export function NeedsYou({ me }: { me: Person }) {
  const chats = useChats()
  const stageName = useStageName()
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
              <Press
                key={c.other}
                className="rw tagged"
                style={{ width: '100%', textAlign: 'left' }}
                label={`${whoName(c.other)} — ${c.last.from === me.id ? 'You: ' : ''}${c.last.b}${c.unread ? `, ${c.unread} unread` : ''}`}
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
              </Press>
            ))}
          </Rows>
        </>
      ) : null}

      <div className="lb">From your department</div>
      {updates.length ? (
        <Rows bare>
          {updates.map((u) => (
            <Press
              key={u.id}
              className="rw tagged"
              style={{ width: '100%', textAlign: 'left' }}
              title={`Chat with ${whoName(u.who)}`}
              label={`${u.kind}: ${whoName(u.who)} — ${u.b}, ${fmtDate(u.d)}${unreadFrom(chats, me.id, u.who) ? `, ${unreadFrom(chats, me.id, u.who)} unread` : ''}. Chat`}
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
            </Press>
          ))}
        </Rows>
      ) : (
        <Note size="body" margin={0}>
          Nothing from the rest of {stageName(me.dep[0] ?? '') || 'your department'} recently.
        </Note>
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
  const stageName = useStageName()

  useEffect(() => {
    markRead(me.id, other)
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
          <div className="chat-sub">{person?.dep.map(stageName).join(', ') || 'No department'}</div>
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
        <Textarea
          rows={2}
          label={`Message ${first}`}
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
