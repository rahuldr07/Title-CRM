import { describe, expect, it } from 'vitest'
import { firstContact, newestFirst } from './leadDetail'

const note = (t: string, at: Date) => ({ w: 'hw', at, t })

describe('a lead’s notes', () => {
  const notes = [note('b', new Date(2026, 6, 2)), note('a', new Date(2026, 5, 1)), note('c', new Date(2026, 7, 1))]

  it('list newest first without reordering the record', () => {
    expect(newestFirst(notes).map((n) => n.t)).toEqual(['c', 'b', 'a'])
    expect(notes.map((n) => n.t)).toEqual(['b', 'a', 'c'])
  })

  it('date the first contact from the earliest note, or nothing when there are none', () => {
    expect(firstContact(notes)).toEqual(new Date(2026, 5, 1))
    expect(firstContact([])).toBeNull()
  })
})
