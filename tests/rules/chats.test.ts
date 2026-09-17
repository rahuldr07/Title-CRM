import { afterEach, describe, expect, it } from 'vitest'
import {
  chatState,
  conversations,
  markRead,
  resetChats,
  sendMessage,
  threadWith,
  unreadFrom,
  unreadTotal,
} from '@/state/chats'

/**
 * Chatting from My work's "Needs you".
 *
 * A thread is the two people in it and nobody else, and the count on "Needs
 * you" is what the reader has not opened. Both are easy to get subtly wrong: a
 * thread filtered on one direction shows only half the conversation, and an
 * unread count that includes your own messages never reaches zero.
 */

afterEach(resetChats)

describe('a thread', () => {
  it('holds both directions, in the order they were sent', () => {
    sendMessage('us', 'ap', 'Is the Cambria chain yours?')
    sendMessage('ap', 'us', 'Yes — picking it up now')
    sendMessage('us', 'kv', 'Unrelated')

    const thread = threadWith(chatState(), 'us', 'ap')
    expect(thread.map((m) => m.b)).toEqual(['Is the Cambria chain yours?', 'Yes — picking it up now'])
    expect(threadWith(chatState(), 'ap', 'us')).toEqual(thread)
  })

  it('refuses an empty message and a message to yourself', () => {
    expect(sendMessage('us', 'ap', '   ')).toBeNull()
    expect(sendMessage('us', 'us', 'hello')).toBeNull()
    expect(chatState().messages).toEqual([])
  })
})

describe('unread', () => {
  it('counts only what the other person sent', () => {
    sendMessage('us', 'ap', 'one')
    sendMessage('ap', 'us', 'two')
    sendMessage('ap', 'us', 'three')

    expect(unreadFrom(chatState(), 'us', 'ap')).toBe(2)
    expect(unreadFrom(chatState(), 'ap', 'us')).toBe(1)
  })

  it('clears when the thread is opened, and comes back for a new message', () => {
    sendMessage('ap', 'us', 'two')
    markRead('us', 'ap')
    expect(unreadTotal(chatState(), 'us')).toBe(0)

    sendMessage('ap', 'us', 'three')
    expect(unreadTotal(chatState(), 'us')).toBe(1)
  })

  it('does not write when there is nothing new to mark', () => {
    sendMessage('us', 'ap', 'one')
    const before = chatState()
    markRead('us', 'ap')
    expect(chatState()).toBe(before)
  })
})

describe('conversations', () => {
  it('lists each person once, most recent first', () => {
    sendMessage('us', 'ap', 'a')
    sendMessage('kv', 'us', 'b')
    sendMessage('ap', 'us', 'c')

    const list = conversations(chatState(), 'us')
    expect(list.map((c) => [c.other, c.last.b, c.unread])).toEqual([
      ['ap', 'c', 1],
      ['kv', 'b', 1],
    ])
    expect(conversations(chatState(), 'sm')).toEqual([])
  })
})
