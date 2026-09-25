import { afterEach, describe, expect, it } from 'vitest'
import { signInOnSeed, endSession, readSession, startSession } from './seedSession'
import { STAFF } from '@/data/people'

afterEach(endSession)

describe('the seed session', () => {
  it('holds nobody until someone signs in', () => {
    expect(readSession()).toBeNull()
  })

  it('remembers who signed in, and forgets them on sign-out', () => {
    startSession('hw')
    expect(readSession()).toBe('hw')
    endSession()
    expect(readSession()).toBeNull()
  })

  it('ignores a remembered id that is not on the roster', () => {
    startSession('ghost')
    expect(readSession()).toBeNull()
  })

  it('signs in anyone on the roster with any password while the demo identity is on', () => {
    const p = STAFF.find((s) => s.id === 'hw')
    if (!p?.e) throw new Error('hw has no email')
    const r = signInOnSeed(p.e, 'anything')
    expect(r.ok && r.person.id).toBe('hw')
  })

  it('still asks for a password', () => {
    const p = STAFF.find((s) => s.id === 'hw')
    expect(signInOnSeed(p?.e ?? '', '').ok).toBe(false)
  })
})
