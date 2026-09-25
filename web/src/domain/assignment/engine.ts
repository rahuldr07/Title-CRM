import { currentLeave } from '@/domain/leave/leaveStore'
import { now } from '@/shared/lib/clock'
import { currentRules } from './rules'
import { currentCoverage } from './levels'
import { currentStaff } from '@/domain/people/roster'
import { currentNaming, stageName } from '@/domain/company/naming'
import { makeDay, type Arrival, type DayBucket } from './day'
import {
  defaultContext,
  freeOn,
  narrowPool,
  type Candidate,
  type ExclusionReason,
  type NarrowStop,
  type RunContext,
  type TraceStep,
} from './narrow'

export interface Exception {
  o: Arrival
  stage: string
  dk: string
  today: boolean
  why: ExclusionReason
  t: string
  near?: string[]
  trace: TraceStep[]
}

export interface Assignment {
  o: Arrival
  stage: string
  who: string
  hr: number
  dk: string
  today: boolean
  trace: TraceStep[]
}

export interface RunResult {
  assigns: Assignment[]
  exc: Exception[]
  load: Record<string, number>
  fired: Record<string, number>
  narrowed: Record<string, number>
  hourly: { hr: number; n: number; used: Record<string, number>; load: Record<string, number> }[]
  avoided: number
  deptOut: string[]
  orders: Arrival[]
  today: Arrival[]
  days: { date: Date; dk: string; n: number }[]
  total: number
  ctx: RunContext
}

function refusal(
  o: Candidate,
  stage: string,
  cx: RunContext,
  { why, rule }: NarrowStop,
  paired?: string,
): { t: string; near?: string[] } {
  const inDept = (covers: (id: string) => boolean) =>
    cx.staff.filter((x) => x.dep.includes(stage) && x.active !== false && covers(x.id)).map((x) => x.id)

  switch (why) {
    case 'no-dept':
      return { t: rule === 'r1' ? `Nobody belongs to ${stageName(stage)}` : `A routing rule left nobody eligible` }
    case 'coverage':
      return rule === 'r6'
        ? {
            t: `Nobody in ${stageName(stage)} covers ${o.co ?? 'that county'}, ${o.st}`,
            near: inDept((id) => cx.coversPlace(id, o.st, null)),
          }
        : {
            t: `Nobody in ${stageName(stage)} who covers ${o.st} works ${o.pr}`,
            near: inDept((id) => cx.coversPlace(id, o.st, o.co ?? null)),
          }
    case 'unavailable':
      return { t: `Everyone eligible for ${stageName(stage)} is on leave or off shift` }
    case 'capacity':
      return { t: `Everyone eligible for ${stageName(stage)} is at their daily target` }
    case 'self':
      return { t: `The only person with room did the ${stageName(paired ?? '')}` }
  }
}

function runDay(days: DayBucket[], overrides: Partial<RunContext> = {}): RunResult {
  const cx: RunContext = { ...defaultContext(), ...overrides }
  const { staff: STAFF, rules: RULES, assignStages: ASSIGN_STAGES } = cx

  const load: Record<string, number> = {}
  const fired: Record<string, number> = {}
  const narrowed: Record<string, number> = {}
  RULES.forEach((r) => {
    fired[r.id] = 0
    narrowed[r.id] = 0
  })
  const bump = (m: Record<string, number>, id: string, by = 1) => {
    m[id] = (m[id] ?? 0) + by
  }

  const assigns: Assignment[] = []
  const exc: Exception[] = []
  let hourly: RunResult['hourly'] = []
  let avoided = 0

  const deptOut = [
    ...new Set(
      cx.stages.filter((g) => {
        const m = cx.staff.filter((s) => s.dep.includes(g))
        return m.length > 0 && m.every((s) => !freeOn(cx, s, now()))
      }),
    ),
  ]

  for (const day of days) {
    STAFF.forEach((s) => {
      load[s.id] = s.open
    })
    const dayHourly: RunResult['hourly'] = []

    for (const slot of day.arrivals) {
      const hStart = Object.fromEntries(STAFF.map((s) => [s.id, load[s.id] ?? 0]))

      for (const o of slot.orders) {
        const onOrder: Record<string, string> = {}
        const trace: TraceStep[] = []

        for (const stage of ASSIGN_STAGES) {
          const from = trace.length
          const nar = narrowPool(o, stage, { ctx: cx, load, taken: onOrder, on: o.recv })

          nar.steps.forEach((s) => {
            bump(fired, s.r)
            if (s.r === 'r1') bump(narrowed, 'r1', s.after)
            else if (s.before !== s.after) bump(narrowed, s.r)
            if (s.r === 'r4' && s.before !== s.after) avoided++
          })
          trace.push(...nar.trace)

          if (nar.stop) {
            const { t, near } = refusal(o, stage, cx, nar.stop, nar.paired)
            exc.push({
              o,
              stage,
              dk: day.dk,
              today: o.today,
              why: nar.stop.why,
              t,
              ...(near ? { near } : {}),
              trace: trace.slice(from),
            })
            continue
          }

          const p = nar.pick
          load[p.id] = (load[p.id] ?? 0) + 1
          onOrder[stage] = p.id
          assigns.push({ o, stage, who: p.id, hr: slot.hr, dk: day.dk, today: o.today, trace: trace.slice(from) })
        }

        o.plan = onOrder
        o.trace = trace
      }

      dayHourly.push({
        hr: slot.hr,
        n: slot.orders.length,
        used: Object.fromEntries(STAFF.map((s) => [s.id, (load[s.id] ?? 0) - (hStart[s.id] ?? 0)])),
        load: { ...load },
      })
    }
    hourly = dayHourly
  }

  const orders = days.flatMap((d) => d.arrivals.flatMap((a) => a.orders))
  return {
    assigns,
    exc,
    load,
    fired,
    narrowed,
    hourly,
    avoided,
    deptOut,
    orders,
    today: orders.filter((o) => o.today),
    days: days.map((d) => ({
      date: d.date,
      dk: d.dk,
      n: d.arrivals.reduce((a, x) => a + x.orders.length, 0),
    })),
    total: orders.length * ASSIGN_STAGES.length,
    ctx: cx,
  }
}

export type PreviewSlot =
  | { who: string; err?: undefined }
  | { who?: undefined; err: string; why: ExclusionReason; t: string; trace: TraceStep[] }

export function previewAssign(
  o: Candidate,
  load: Record<string, number>,
  overrides: Partial<RunContext> = {},
): Record<string, PreviewSlot> {
  const cx: RunContext = { ...defaultContext(), ...overrides }
  const at = { ...load }
  const onOrder: Record<string, string> = {}
  const out: Record<string, PreviewSlot> = {}

  for (const stage of cx.assignStages) {
    const nar = narrowPool(o, stage, { ctx: cx, load: at, taken: onOrder })
    if (nar.stop) {
      out[stage] = { err: previewErr(o, nar.stop), why: nar.stop.why, t: refusal(o, stage, cx, nar.stop, nar.paired).t, trace: nar.trace }
      continue
    }
    const p = nar.pick
    at[p.id] = (at[p.id] ?? 0) + 1
    onOrder[stage] = p.id
    out[stage] = { who: p.id }
  }

  return out
}

function previewErr(o: Candidate, { why, rule }: NarrowStop): string {
  switch (why) {
    case 'no-dept':
      return rule === 'r1' ? 'nobody in the department' : 'a routing rule left nobody'
    case 'coverage':
      return rule === 'r6' ? `nobody covers ${o.co ?? o.st}` : `nobody here works ${o.pr}`
    case 'unavailable':
      return 'nobody available'
    case 'capacity':
      return 'everyone at their target'
    case 'self':
      return 'would be self-review'
  }
}

export interface AssignmentBoard {
  day: DayBucket[]
  run: RunResult
}

let memo: AssignmentBoard | null = null
let memoKey: readonly unknown[] = []

export function computeBoard(overrides: Partial<RunContext> = {}): AssignmentBoard {
  const day = makeDay()
  return { day, run: runDay(day, overrides) }
}

export function board(): AssignmentBoard {
  const key = [currentStaff(), currentCoverage(), currentRules(), currentLeave(), currentNaming()]
  if (!memo || key.some((k, i) => k !== memoKey[i])) {
    memo = computeBoard()
    memoKey = key
  }
  return memo
}

export function resetBoard(): void {
  memo = null
  memoKey = []
}

export const arrivalById = (id: string): Arrival | undefined =>
  board().run.orders.find((o) => o.id === id)
