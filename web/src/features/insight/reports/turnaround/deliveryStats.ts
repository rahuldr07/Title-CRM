import { median } from '@/shared/lib/stats'
import { checkpoints } from '@/domain/assignment/sla'
import { ASSIGN_STAGES } from '@/data/org'
import type { Delivery } from '@/data/deliveries'

export const budgetFor = (x: Delivery, stage: string) =>
  checkpoints(x.slaH, x.pr).find((y) => y.stage === stage)?.hours ?? 0

const spentOn = (x: Delivery, stage: string) => x.st[stage] ?? 0

interface Overrun {
  st: string
  h: number
  c: number
}

export const overruns = (x: Delivery): Overrun[] =>
  ASSIGN_STAGES.map((st) => ({ st, h: spentOn(x, st), c: budgetFor(x, st) }))
    .filter((y) => y.h > y.c)
    .sort((a, b) => b.h - b.c - (a.h - a.c))

export interface DeliveryLine {
  x: Delivery
  over: Overrun[]
}

export const withOverruns = (list: readonly Delivery[]): DeliveryLine[] =>
  list.map((x) => ({ x, over: overruns(x) }))

export const slowestFirst = (d: readonly Delivery[]): Delivery[] =>
  d.slice().sort((a, b) => b.hrs / b.slaH - a.hrs / a.slaH)

export const worstLate = (late: readonly Delivery[], n: number): DeliveryLine[] =>
  withOverruns(
    late
      .slice()
      .sort((a, b) => b.hrs - b.slaH - (a.hrs - a.slaH))
      .slice(0, n),
  )

export interface StageRow {
  st: string
  med: number
  over: number
  overPct: number
  budget: number
  share: number
}

export function stageRows(d: Delivery[]): StageRow[] {
  return ASSIGN_STAGES.map((st) => {
    const times = d.map((x) => x.st[st]).filter((v) => typeof v === 'number')
    const over = d.filter((x) => {
      const c = budgetFor(x, st)
      return c && spentOn(x, st) > c
    })
    return {
      st,
      med: median(times),
      over: over.length,
      overPct: d.length ? Math.round((over.length / d.length) * 100) : 0,
      budget: median(d.map((x) => budgetFor(x, st))),
      share: 0,
    }
  })
}

interface GroupRow {
  k: string
  delivered: number
  late: number
  pct: number
  med: number
  promise: number
}

export function groupRows(d: Delivery[], key: 'cl' | 'pr'): GroupRow[] {
  return [...new Set(d.map((x) => x[key]))].sort().map((k) => {
    const m = d.filter((x) => x[key] === k)
    const l = m.filter((x) => x.late).length
    return {
      k,
      delivered: m.length,
      late: l,
      pct: Math.round(((m.length - l) / m.length) * 100),
      med: median(m.map((x) => x.hrs)),
      promise: median(m.map((x) => x.slaH)),
    }
  })
}

export function outcomeList(d: Delivery[], late: boolean): Delivery[] {
  return d
    .filter((x) => x.late === late)
    .sort((a, b) => (late ? b.hrs - b.slaH - (a.hrs - a.slaH) : a.slaH - a.hrs - (b.slaH - b.hrs)))
}

export const tightCount = (list: Delivery[]) => list.filter((x) => x.slaH - x.hrs < x.slaH * 0.1).length

interface StageOverrun {
  x: Delivery
  h: number
  c: number
  ratio: number
}

export function stageOverruns(d: Delivery[], stage: string): StageOverrun[] {
  return d
    .map((x) => ({ x, h: spentOn(x, stage), c: budgetFor(x, stage) }))
    .filter((y) => y.c && y.h > y.c)
    .map((y) => ({ ...y, ratio: y.h / y.c }))
    .sort((a, b) => b.ratio - a.ratio)
}

export function overranBy(items: StageOverrun[], stage: string): Record<string, number> {
  const whoBy: Record<string, number> = {}
  items.forEach((i) => {
    const n = i.x.byName?.[stage]
    if (n) whoBy[n] = (whoBy[n] ?? 0) + 1
  })
  return whoBy
}

const BUCKETS: [number, number, string][] = [
  [0, 0.5, 'under half the promise'],
  [0.5, 0.75, '50–75%'],
  [0.75, 0.9, '75–90%'],
  [0.9, 1, '90–100%'],
  [1, 1.25, 'up to 25% over'],
  [1.25, Infinity, 'more than 25% over'],
]

export function spreadBuckets(d: Delivery[]): { label: string; n: number; over: boolean }[] {
  return BUCKETS.map(([lo, hi, label]) => ({
    label,
    n: d.filter((x) => x.hrs / x.slaH >= lo && x.hrs / x.slaH < hi).length,
    over: lo >= 1,
  }))
}
