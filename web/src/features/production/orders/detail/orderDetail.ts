import { ASSIGN_STAGES } from '@/data/org'
import type { Assignments, Order, OrderStatus, Rule } from '@/data/types'
import { board } from '@/domain/assignment/engine'
import { narrowPool } from '@/domain/assignment/narrow'
import { currentStatuses } from '@/domain/company/statuses'
import type { EditedOrder, OrderEvent, QcField, StageRating, workingOn } from '@/domain/orders/orders'
import { r2 } from '@/shared/lib/format'
import { slaRuleFor, slaText } from '@/domain/assignment/sla'

type Working = ReturnType<typeof workingOn>
export type OrderCost = Working['costs'][number]
export type OrderNote = Working['notes'][number]

export type HistoryRow = [Date, string, string, string]

export const isStatus = (v: string): v is OrderStatus => currentStatuses().some(([k]) => k === v)

export const costTotalOf = (costs: readonly { amt: number }[]): number =>
  r2(costs.reduce((a, c) => a + c.amt, 0))

export function withScore(r: StageRating, field: QcField, v: number): StageRating {
  const { [field]: _cleared, ...rest } = r.scores
  return { ...r, scores: v ? { ...rest, [field]: v } : rest }
}

export function historyRows(received: Pick<Order, 'recv' | 'due' | 'cl' | 'pr'>, events: readonly OrderEvent[]): HistoryRow[] {
  return [
    [received.recv, 'Order received', 'system', `${received.cl} · ${received.pr}`],
    [received.recv, 'Due date set', 'system', slaText(slaRuleFor(received.cl, received.pr), received.due)],
    ...events.map((e): HistoryRow => [e.at, e.what, e.by || '—', e.detail]),
  ]
}

export function planAssignAll(
  o: EditedOrder,
  assign: Assignments,
  rules: readonly Pick<Rule, 'id' | 'n'>[],
  load: Readonly<Record<string, number>> = board().run.load,
) {
  const open = ASSIGN_STAGES.filter((g) => !assign[g])
  const taken: Assignments = { ...assign }
  const at: Record<string, number> = { ...load }
  const preview = open.map((stage) => {
    const narrowed = narrowPool(o, stage, { load: at, taken, target: false })
    const person = narrowed.pool[0]
    if (person) {
      taken[stage] = person.id
      at[person.id] = (at[person.id] ?? 0) + 1
    }
    return { stage, person, steps: narrowed.steps }
  })
  const consulted = new Set(preview.flatMap((p) => p.steps.map((s) => s.r)))
  const applied = rules.filter((r) => consulted.has(r.id)).map((r) => r.n)
  return { open, load, taken, preview, applied }
}

export type AssignAllPlan = ReturnType<typeof planAssignAll>
