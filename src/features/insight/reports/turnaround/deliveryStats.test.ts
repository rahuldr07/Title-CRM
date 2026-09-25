import { describe, expect, it } from 'vitest'
import {
  budgetFor,
  groupRows,
  outcomeList,
  overranBy,
  overruns,
  slowestFirst,
  spreadBuckets,
  stageOverruns,
  stageRows,
  tightCount,
  withOverruns,
  worstLate,
} from './deliveryStats'
import type { Delivery } from '@/data/deliveries'

const del = (
  id: string,
  cl: string,
  st: [number, number, number, number, number],
  hrs: number,
  late: boolean,
): Delivery => ({
  id,
  d: new Date(2026, 6, 20),
  cl,
  pr: 'COS',
  slaH: 24,
  st: { Search: st[0], 'Search QC': st[1], Typing: st[2], 'Typing QC': st[3], RTS: st[4] },
  by: {},
  byName: { Search: 'Prasad M D', Typing: 'Pavan Kumar' },
  hrs,
  late,
})

const a = del('A', 'MGR', [12, 1, 6, 1, 0.5], 20.5, false)
const b = del('B', 'ABC', [5, 3, 4, 1, 2], 26, true)
const c = del('C', 'MGR', [3, 1, 2, 1, 0.5], 7.5, false)
const d = del('D', 'ABC', [10, 2, 5, 2, 0.8], 23, false)
const all = [a, b, c, d]

describe('stage budgets', () => {
  it('reads the checkpoint hours the promise allows each stage', () => {
    expect(budgetFor(a, 'Search')).toBeCloseTo(10.8)
    expect(budgetFor(a, 'RTS')).toBeCloseTo(0.864)
    expect(budgetFor(a, 'Doc Req')).toBe(0)
  })

  it('lists the stages that overran, the largest overrun first', () => {
    expect(overruns(a).map((x) => x.st)).toEqual(['Search', 'Typing'])
    expect(overruns(b).map((x) => x.st)).toEqual(['RTS', 'Search QC'])
    expect(overruns(c)).toEqual([])
  })
})

describe('where the time goes', () => {
  it('takes each stage median against the budget, with the share left for the caller', () => {
    const rows = stageRows(all)
    expect(rows.map((r) => r.st)).toEqual(['Search', 'Search QC', 'Typing', 'Typing QC', 'RTS'])
    expect(rows[0]).toEqual({ st: 'Search', med: 7.5, over: 1, overPct: 25, budget: expect.closeTo(10.8), share: 0 })
    expect(rows.map((r) => r.over)).toEqual([1, 1, 1, 0, 1])
  })

  it('reports nothing over when nothing was delivered', () => {
    expect(stageRows([]).every((r) => r.overPct === 0 && r.med === 0)).toBe(true)
  })
})

describe('by client or product', () => {
  it('groups in key order with on-time share, median and promise', () => {
    expect(groupRows(all, 'cl')).toEqual([
      { k: 'ABC', delivered: 2, late: 1, pct: 50, med: 24.5, promise: 24 },
      { k: 'MGR', delivered: 2, late: 0, pct: 100, med: 14, promise: 24 },
    ])
    expect(groupRows(all, 'pr').map((g) => g.k)).toEqual(['COS'])
  })
})

describe('focusing on an outcome', () => {
  it('puts the worst overrun first among the late', () => {
    expect(outcomeList(all, true).map((x) => x.id)).toEqual(['B'])
  })

  it('puts the tightest first among the on-time, and counts those inside 10% of the promise', () => {
    const met = outcomeList(all, false)
    expect(met.map((x) => x.id)).toEqual(['D', 'A', 'C'])
    expect(tightCount(met)).toBe(1)
  })
})

describe('the worst stage', () => {
  it('lists its overruns by ratio and who was on them', () => {
    const items = stageOverruns(all, 'Search')
    expect(items.map((i) => i.x.id)).toEqual(['A'])
    expect(items[0]?.ratio).toBeCloseTo(12 / 10.8)
    expect(overranBy(items, 'Search')).toEqual({ 'Prasad M D': 1 })
    expect(overranBy(stageOverruns(all, 'RTS'), 'RTS')).toEqual({})
  })
})

describe('the spread', () => {
  it('buckets each turnaround by the share of its own promise used', () => {
    const s = spreadBuckets(all)
    expect(s.map((x) => x.n)).toEqual([1, 0, 1, 1, 1, 0])
    expect(s.map((x) => x.over)).toEqual([false, false, false, false, true, true])
    expect(s[0]?.label).toBe('under half the promise')
  })
})

describe('a list of deliveries on screen', () => {
  it('works out each row’s overruns once, with the list', () => {
    const lines = withOverruns([a, b, c])
    expect(lines.map((l) => l.x.id)).toEqual(['A', 'B', 'C'])
    expect(lines.map((l) => l.over.map((o) => o.st))).toEqual([['Search', 'Typing'], ['RTS', 'Search QC'], []])
  })

  it('orders the slowest by share of the promise used, without touching the input', () => {
    const input = [c, a, b, d]
    expect(slowestFirst(input).map((x) => x.id)).toEqual(['B', 'D', 'A', 'C'])
    expect(input.map((x) => x.id)).toEqual(['C', 'A', 'B', 'D'])
  })

  it('takes the worst late deliveries first, each with its overruns', () => {
    const late = [del('L1', 'MGR', [1, 1, 1, 1, 1], 30, true), b, del('L2', 'MGR', [30, 1, 1, 1, 1], 40, true)]
    const worst = worstLate(late, 2)
    expect(worst.map((l) => l.x.id)).toEqual(['L2', 'L1'])
    expect(worst[0]?.over[0]?.st).toBe('Search')
  })
})
