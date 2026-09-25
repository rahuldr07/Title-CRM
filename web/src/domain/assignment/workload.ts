import { ASSIGN_STAGES } from '@/data/org'
import { PRODUCTS } from '@/data/catalog'
import { midnight } from '@/shared/lib/format'
import { now } from '@/shared/lib/clock'
import type { Order, Person } from '@/data/types'
import { STAGE_STATUS } from './sla'
import type { Arrival } from './day'
import { freeOn, type RunContext } from './narrow'

const STAGE_HOURS = 1.5

const ageHrs = (o: Arrival) =>
  Math.round((midnight(now()).getTime() - midnight(o.date).getTime()) / 36e5) + (now().getHours() + now().getMinutes() / 60 - o.hr)

const doneCount = (o: Arrival) =>
  Math.max(0, Math.min(ASSIGN_STAGES.length, Math.floor(ageHrs(o) / STAGE_HOURS)))

const simulatedStage = (o: Arrival): string | null => ASSIGN_STAGES[doneCount(o)] ?? null

export interface WorkRow {
  s: Person
  done: number
  pend: number
  tot: number
  pct: number
  items: { o: Arrival; stage: string; fin: boolean; hr: number }[]
  stages: Record<string, { done: number; pend: number }>
}

export interface WorkTask {
  o: Arrival
  stage: string
  who: string
  hr: number
  fin: boolean
}

export function staffRows(staff: readonly Person[], tasks: readonly WorkTask[]): Record<string, WorkRow> {
  const m: Record<string, WorkRow> = {}
  staff.filter((s) => s.dep.length).forEach((s) => {
    m[s.id] = { s, done: 0, pend: 0, tot: 0, pct: 0, items: [], stages: {} }
  })
  tasks.forEach((a) => {
    const r = m[a.who]
    if (!r) return
    const cell = (r.stages[a.stage] ??= { done: 0, pend: 0 })
    if (a.fin) {
      r.done++
      cell.done++
    } else {
      r.pend++
      cell.pend++
    }
    r.items.push({ o: a.o, stage: a.stage, fin: a.fin, hr: a.hr })
  })
  Object.values(m).forEach((r) => {
    r.tot = r.done + r.pend
    r.pct = r.tot ? Math.round((r.done / r.tot) * 100) : 0
  })
  return m
}

export interface DeptRow {
  d: string
  done: number
  pend: number
  tot: number
  pct: number
  unplaced: number
  auto: boolean
  staff: Person[]
  cap: number
  free: Person[]
  avail: number
  items: { o: Arrival; who: string; fin: boolean; hr: number }[]
  people: Record<string, { done: number; pend: number }>
}

export function deptRows(cx: RunContext, tasks: readonly WorkTask[], unplaced: readonly { stage: string }[]): Record<string, DeptRow> {
  const m: Record<string, DeptRow> = {}
  cx.stages.forEach((d) => {
    const staff = cx.staff.filter((s) => s.dep.includes(d))
    const free = staff.filter((s) => freeOn(cx, s, now()))
    m[d] = {
      d,
      done: 0,
      pend: 0,
      tot: 0,
      pct: 0,
      unplaced: 0,
      auto: cx.assignStages.includes(d),
      staff,
      cap: free.reduce((a, s) => a + s.cap, 0),
      free,
      avail: free.length,
      items: [],
      people: {},
    }
  })
  tasks.forEach((a) => {
    const r = m[a.stage]
    if (!r) return
    const cell = (r.people[a.who] ??= { done: 0, pend: 0 })
    if (a.fin) {
      r.done++
      cell.done++
    } else {
      r.pend++
      cell.pend++
    }
    r.items.push({ o: a.o, who: a.who, fin: a.fin, hr: a.hr })
  })
  unplaced.forEach((e) => {
    const r = m[e.stage]
    if (r) r.unplaced++
  })
  Object.values(m).forEach((r) => {
    r.tot = r.done + r.pend
    r.pct = r.tot ? Math.round((r.done / r.tot) * 100) : 0
  })
  return m
}

export function arrivalAsOrder(o: Arrival, slaHours: number): Order {
  const stage = simulatedStage(o)
  const age = Math.max(0, Math.round(ageHrs(o)))
  return {
    id: o.id,
    cl: o.cl,
    pr: o.pr,
    stt: (stage ? STAGE_STATUS[stage] : 'sent') ?? 'search',
    st: o.st,
    co: o.co,
    prop: '',
    a: { ...(o.plan ?? {}) },
    due: new Date(o.recv.getTime() + slaHours * 36e5),
    recv: o.recv,
    fee: PRODUCTS.find((p) => p.id === o.pr)?.fee ?? 0,
    age: stage ? `${age}h in ${stage}` : `${age}h, delivered`,
    done: !stage,
    ...(stage ? {} : { sentAt: new Date(o.recv.getTime() + ASSIGN_STAGES.length * STAGE_HOURS * 36e5) }),
  }
}
