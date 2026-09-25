import { ASSIGN_STAGES, COVSTAGES, PAIRS, STAGES } from '@/data/org'
import { now } from '@/shared/lib/clock'
import { coversPlace, coversProduct } from './levels'
import type { Person, Rule, RuleCondition } from '@/data/types'
import { onLeaveOn } from '@/domain/leave/leave'
import { currentRules } from './rules'
import { currentStaff, findPerson } from '@/domain/people/roster'
import { stageName } from '@/domain/company/naming'
import type { Arrival } from './day'

export interface RunContext {
  staff: Person[]
  rules: Rule[]
  assignStages: string[]
  stages: string[]
  pairs: Record<string, string>
  covStages: string[]
  coversPlace: (id: string, state: string, county: string | null) => boolean
  coversProduct: (id: string, product: string) => boolean
  onLeave: (id: string, d: Date) => boolean
}

export const defaultContext = (): RunContext => ({
  staff: currentStaff(),
  rules: currentRules(),
  assignStages: ASSIGN_STAGES,
  stages: STAGES,
  pairs: PAIRS,
  covStages: COVSTAGES,
  coversPlace,
  coversProduct,
  onLeave: onLeaveOn,
})

export const freeOn = (cx: RunContext, s: Person, d: Date) =>
  s.avail === 'ok' && s.active !== false && !cx.onLeave(s.id, d)

export type Candidate = Pick<Arrival, 'pr' | 'st' | 'cl'> & { co?: string | null }

const ruleOn = (id: string, rules: Rule[] = currentRules()) =>
  rules.find((x) => x.id === id)?.on ?? false

export function ruleMatches(r: Rule, o: Candidate, stage: string): boolean {
  const c: RuleCondition = r.cond ?? {}
  if (c.stage && c.stage !== stage) return false
  if (c.product && c.product !== o.pr) return false
  if (c.state && c.state !== o.st) return false
  return true
}

export interface TraceStep {
  r: string
  left: number
  note: string
}

export type ExclusionReason = 'no-dept' | 'coverage' | 'unavailable' | 'capacity' | 'self'

interface NarrowStep {
  r: string
  before: number
  after: number
  note: string
}

export interface NarrowStop {
  why: ExclusionReason
  rule: string
}

interface NarrowBase {
  pool: Person[]
  steps: NarrowStep[]
  trace: TraceStep[]
  paired?: string
}

export type NarrowResult =
  | (NarrowBase & { stop: NarrowStop; pick?: undefined })
  | (NarrowBase & { stop?: undefined; pick: Person })

export interface NarrowOptions {
  ctx?: RunContext
  load?: Record<string, number>
  taken?: Record<string, string | null | undefined>
  target?: boolean
  on?: Date
}

export function narrowPool(o: Candidate, stage: string, opts: NarrowOptions = {}): NarrowResult {
  const cx = opts.ctx ?? defaultContext()
  const { load = {}, taken = {}, target = true } = opts
  const at = (id: string) => load[id] ?? 0
  const whoName = (id: string | null | undefined) => findPerson(cx.staff, id)?.n ?? '—'
  const paired = cx.pairs[stage]

  const steps: NarrowStep[] = []
  const trace: TraceStep[] = []
  const step = (r: string, before: number, after: number, note: string, always = false) => {
    steps.push({ r, before, after, note })
    if (always || before !== after) trace.push({ r, left: after, note })
  }
  const stop = (why: ExclusionReason, rule: string): NarrowResult => ({
    pool: [],
    stop: { why, rule },
    steps,
    trace,
    ...(paired ? { paired } : {}),
  })

  let pool = cx.staff.filter((s) => s.dep.includes(stage))
  step('r1', pool.length, pool.length, `${pool.length} in ${stageName(stage)}`, true)
  if (!pool.length) return stop('no-dept', 'r1')

  let emptiedBy: string | undefined
  for (const r of cx.rules.filter((x) => x.k === 'route' && x.on && x.cond)) {
    if (!ruleMatches(r, o, stage)) continue
    const before = pool.length
    pool = pool.filter((s) => r.pool?.includes(s.id))
    step(r.id, before, pool.length, `${r.n} — ${before} → ${pool.length}`, true)
    if (!pool.length && !emptiedBy) emptiedBy = r.id
  }
  if (!pool.length) return stop('no-dept', emptiedBy ?? 'r1')

  if (ruleOn('r6', cx.rules) && cx.covStages.includes(stage)) {
    const before = pool.length
    pool = pool.filter((x) => cx.coversPlace(x.id, o.st, o.co ?? null))
    step('r6', before, pool.length, `${stageName(stage)} — covers ${o.co}, ${o.st} — ${before} → ${pool.length}`)
    if (!pool.length) return stop('coverage', 'r6')
  }

  if (ruleOn('r7', cx.rules) && cx.covStages.includes(stage)) {
    const before = pool.length
    pool = pool.filter((x) => cx.coversProduct(x.id, o.pr))
    step('r7', before, pool.length, `${stageName(stage)} — works ${o.pr} — ${before} → ${pool.length}`)
    if (!pool.length) return stop('coverage', 'r7')
  }

  if (ruleOn('r2', cx.rules)) {
    const before = pool.length
    const day = opts.on ?? now()
    pool = pool.filter((s) => freeOn(cx, s, day))
    step('r2', before, pool.length, `availability — ${before} → ${pool.length}`)
  }
  if (!pool.length) return stop('unavailable', 'r2')

  if (target && ruleOn('r3', cx.rules)) {
    const before = pool.length
    pool = pool.filter((s) => at(s.id) < s.cap)
    step('r3', before, pool.length, `at target — ${before} → ${pool.length}`)
  }
  if (!pool.length) return stop('capacity', 'r3')

  if (ruleOn('r4', cx.rules) && paired) {
    const before = pool.length
    pool = pool.filter((s) => !wouldSelfReview(taken, stage, s.id))
    step('r4', before, pool.length, `self-review — skipped ${whoName(taken[paired])}`)
  }

  pool.sort((a, b) => at(a.id) / a.cap - at(b.id) / b.cap)
  const p = pool[0]
  if (!p) return stop('self', 'r4')

  const note = `emptiest — ${p.n} at ${at(p.id)}/${p.cap}`
  steps.push({ r: 'r8', before: pool.length, after: pool.length, note })
  trace.push({ r: 'r8', left: 1, note })

  return { pool, pick: p, steps, trace, ...(paired ? { paired } : {}) }
}

export function wouldSelfReview(
  assign: Readonly<Record<string, string | null | undefined>>,
  stage: string,
  personId: string,
): string | null {
  const paired = PAIRS[stage]
  return paired && assign[paired] === personId ? paired : null
}

export const EXCLUSION: Record<ExclusionReason, [string, 'warn' | 'bad', string]> = {
  capacity: [
    'Everyone at their daily target',
    'warn',
    'Raise the target, add someone to that department, or accept the queue.',
  ],
  unavailable: [
    'Nobody available',
    'bad',
    'Cover, or a rule that routes elsewhere when a department is empty.',
  ],
  'no-dept': ['No one in the department', 'bad', 'Add a member, or the stage cannot run at all.'],
  self: [
    'Would be self-review',
    'warn',
    'Self-review is blocked, so the work waited rather than being checked by its author.',
  ],
  coverage: [
    'Nobody covers that place or product',
    'bad',
    'Widen somebody’s level, or add a person who already covers it.',
  ],
}
