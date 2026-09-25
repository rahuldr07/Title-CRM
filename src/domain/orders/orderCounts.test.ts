import { afterEach, describe, expect, it } from 'vitest'
import { SEED_NOW, resetClock, setClock } from '@/shared/lib/clock'
import { ORDERS } from '@/data/production'
import { atRiskCount, openCount, pastDueCount } from './orderCounts'
import { orderState } from './orderState'
import { allOrders } from './orders'

afterEach(resetClock)

describe('the states as the dashboard tiles count them', () => {
  it('is what the dashboard tiles count', () => {
    expect(pastDueCount()).toBe(ORDERS.filter((o) => orderState(o) === 'late').length)
    expect(atRiskCount()).toBe(ORDERS.filter((o) => orderState(o) === 'soon').length)
    expect(pastDueCount()).toBe(2)
    expect(atRiskCount()).toBe(1)
  })
})

describe('the counts the shell reads', () => {
  it('follow the clock rather than the module load', () => {
    setClock(() => SEED_NOW)
    const atSeed = { past: pastDueCount(), risk: atRiskCount(), open: openCount() }

    setClock(() => new Date(SEED_NOW.getTime() + 14 * 24 * 3600_000))
    expect(pastDueCount()).toBeGreaterThan(atSeed.past)
    expect(atRiskCount()).toBe(0)

    setClock(() => new Date(SEED_NOW.getTime() - 60 * 24 * 3600_000))
    expect(pastDueCount()).toBe(0)
  })

  it('never counts a delivered order as outstanding', () => {
    setClock(() => new Date(SEED_NOW.getTime() + 365 * 24 * 3600_000))
    expect(openCount()).toBe(allOrders().filter((o) => !o.done).length)
    expect(pastDueCount()).toBeLessThanOrEqual(openCount())
  })
})
