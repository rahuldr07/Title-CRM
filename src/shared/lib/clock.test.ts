import { afterEach, describe, expect, it } from 'vitest'
import { SEED_NOW, now, resetClock, setClock } from './clock'
import { daysSince, fmtDate } from './format'

afterEach(resetClock)

describe('the default', () => {
  it('is the design’s pinned instant, so the seed figures stay reproducible', () => {
    expect(now().getTime()).toBe(SEED_NOW.getTime())
    expect(fmtDate(now())).toBe('08/03/2026')
  })
})

describe('swapping it', () => {
  it('moves what "now" means', () => {
    setClock(() => new Date(2027, 0, 15, 9, 0))
    expect(fmtDate(now())).toBe('01/15/2027')
  })

  it('counts days from wherever the clock is', () => {
    const then = new Date(2026, 6, 24)
    setClock(() => new Date(2026, 7, 3))
    expect(daysSince(then)).toBe(10)
    setClock(() => new Date(2026, 7, 13))
    expect(daysSince(then)).toBe(20)
  })
})

describe('resetting it', () => {
  it('puts the seed clock back, so one test cannot leak into the next', () => {
    setClock(() => new Date(2030, 0, 1))
    resetClock()
    expect(now().getTime()).toBe(SEED_NOW.getTime())
  })
})
