import { describe, expect, it } from 'vitest'
import { criteriaLost, ratersOf, teamSummary, weakDepartments } from './qcStats'
import type { Delivery } from '@/data/deliveries'
import type { QcEntry } from '@/data/quality'

const rating = (
  byName: string,
  acc: number,
  comp: number,
  fmt: number,
  crit: string | null = null,
  note: string | null = null,
): QcEntry => {
  const avg = (acc + comp + fmt) / 3
  return {
    d: new Date(2026, 6, 20),
    order: '4180000-1',
    cl: 'MGR',
    pr: 'COS',
    stage: 'Typing QC',
    on: 'pk',
    onName: 'Pavan Kumar',
    by: byName.slice(0, 2),
    byName,
    acc,
    comp,
    fmt,
    avg,
    defect: Math.min(acc, comp, fmt) <= 3,
    crit,
    note,
  }
}

const clean = rating('Uma Reddy', 5, 5, 5)
const typo = rating('Uma Reddy', 4, 5, 5, 'Accuracy', 'Mortgage amount out by a digit')
const typo2 = rating('Lalitha N', 3, 5, 5, 'Accuracy', 'Mortgage amount out by a digit')
const caps = rating('Uma Reddy', 5, 5, 4, 'Formatting', 'Money written without cents')
const mine = [clean, typo, typo2, caps]
const below = mine.filter((x) => x.crit)

describe('the team summary', () => {
  const dels = [{}, {}, {}] as Delivery[]

  it('counts two checks per delivery and rates coverage against them', () => {
    const s = teamSummary(dels, mine)
    expect(s.opportunities).toBe(6)
    expect(s.cover).toBe(67)
    expect(s.defects).toEqual([typo2])
    expect(s.spread).toBe(2)
    expect(s.overall).toBeCloseTo((15 + 14 + 13 + 14) / 12)
  })

  it('reads zero rather than dividing by nothing', () => {
    expect(teamSummary([], [])).toEqual({ opportunities: 0, cover: 0, overall: null, defects: [], spread: 0 })
  })
})

describe('weak departments', () => {
  it('lists departments inside budget under 70% of the time, weakest first', () => {
    const tw = {
      people: {},
      dept: {
        Search: { n: 10, over: 4, rate: 60 },
        Typing: { n: 10, over: 1, rate: 90 },
        RTS: { n: 10, over: 5, rate: 50 },
      },
    }
    expect(weakDepartments(tw).map(([k]) => k)).toEqual(['RTS', 'Search'])
  })
})

describe('one person’s ratings', () => {
  it('attributes lost marks to the criterion, most first, with each criterion’s average', () => {
    expect(criteriaLost(mine, below)).toEqual([
      { c: 'Accuracy', n: 2, avg: 17 / 4 },
      { c: 'Formatting', n: 1, avg: 19 / 4 },
      { c: 'Completeness', n: 0, avg: 5 },
    ])
  })

  it('groups ratings by who gave them, busiest rater first', () => {
    const r = ratersOf(mine)
    expect(r.map((x) => [x.n, x.c])).toEqual([
      ['Uma Reddy', 3],
      ['Lalitha N', 1],
    ])
    expect(r[0]?.avg).toBeCloseTo((15 + 14 + 14) / 9)
  })
})
