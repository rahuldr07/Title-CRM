import { describe, expect, it } from 'vitest'
import { capList, LIST_CAP, sameItems } from './cap'

const range = (n: number) => Array.from({ length: n }, (_, i) => i)

describe('capList', () => {
  it('shows the first LIST_CAP and counts the rest as hidden', () => {
    const c = capList(range(100), false)
    expect(c.shown).toHaveLength(LIST_CAP)
    expect(c.shown[0]).toBe(0)
    expect(c.total).toBe(100)
    expect(c.hidden).toBe(100 - LIST_CAP)
  })

  it('shows everything once asked, and hides nothing', () => {
    const c = capList(range(100), true)
    expect(c.shown).toHaveLength(100)
    expect(c.hidden).toBe(0)
  })

  it('hides nothing when the list is already under the cap', () => {
    expect(capList(range(3), false)).toEqual({ shown: [0, 1, 2], total: 3, hidden: 0 })
  })

  it('takes a different cap', () => {
    expect(capList(range(20), false, 12).hidden).toBe(8)
  })

  it('never hands back the caller’s array', () => {
    const list = range(3)
    expect(capList(list, true).shown).not.toBe(list)
  })
})

describe('sameItems', () => {
  it('holds a list shown in full open when it is worked out again with the same items', () => {
    const a = [{ id: 1 }, { id: 2 }]
    expect(sameItems(a, [...a])).toBe(true)
  })

  it('folds it back when a different focus, range or filter hands over a different list', () => {
    const a = [{ id: 1 }, { id: 2 }]
    expect(sameItems(a, [a[1], a[0]])).toBe(false)
    expect(sameItems(a, a.slice(0, 1))).toBe(false)
  })

  it('compares by key where the rows are rebuilt on every render', () => {
    const key = (x: { id: number }) => x.id
    expect(sameItems([{ id: 1 }], [{ id: 1 }])).toBe(false)
    expect(sameItems([{ id: 1 }], [{ id: 1 }], key)).toBe(true)
    expect(sameItems([{ id: 1 }], [{ id: 2 }], key)).toBe(false)
  })
})
