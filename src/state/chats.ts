import { now } from '@/lib/clock'
import { createStore, useStore } from '@/lib/store'

export interface ChatMessage {
  /* Order comes from `seq`, not `d`: the clock is pinned, so every message sent
     in a session carries the same instant and a sort by time would shuffle. */
  seq: number
  from: string
  to: string
  d: Date
  b: string
}

export interface ChatState {
  messages: ChatMessage[]
  /** The highest `seq` each reader has seen from each person, keyed `reader>other`. */
  read: Record<string, number>
}

export interface Conversation {
  other: string
  last: ChatMessage
  unread: number
}

const store = createStore<ChatState>({ messages: [], read: {} })

export const useChats = (): ChatState => useStore(store)

const readKey = (me: string, other: string) => `${me}>${other}`

const between = (m: ChatMessage, a: string, b: string) =>
  (m.from === a && m.to === b) || (m.from === b && m.to === a)

export const threadWith = (state: ChatState, me: string, other: string): ChatMessage[] =>
  state.messages.filter((m) => between(m, me, other))

export const unreadFrom = (state: ChatState, me: string, other: string): number => {
  const seen = state.read[readKey(me, other)] ?? 0
  return state.messages.filter((m) => m.from === other && m.to === me && m.seq > seen).length
}

export function conversations(state: ChatState, me: string): Conversation[] {
  const latest = new Map<string, ChatMessage>()
  for (const m of state.messages) {
    if (m.from !== me && m.to !== me) continue
    latest.set(m.from === me ? m.to : m.from, m)
  }
  return [...latest.entries()]
    .map(([other, last]) => ({ other, last, unread: unreadFrom(state, me, other) }))
    .sort((a, b) => b.last.seq - a.last.seq)
}

export const unreadTotal = (state: ChatState, me: string): number =>
  conversations(state, me).reduce((n, c) => n + c.unread, 0)

export function sendMessage(from: string, to: string, body: string): ChatMessage | null {
  const b = body.trim()
  if (!b || from === to) return null
  const entry: ChatMessage = { seq: store.get().messages.length + 1, from, to, d: now(), b }
  store.update((s) => ({ ...s, messages: [...s.messages, entry] }))
  return entry
}

export function markRead(me: string, other: string): void {
  const s = store.get()
  const last = threadWith(s, me, other).reduce((n, m) => (m.from === other ? m.seq : n), 0)
  if ((s.read[readKey(me, other)] ?? 0) >= last) return
  store.set({ ...s, read: { ...s.read, [readKey(me, other)]: last } })
}

export const chatState = store.get

export const resetChats = store.reset
