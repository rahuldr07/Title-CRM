import { ORDERS } from '@/data/production'
import { SEED_DOCS, type OrderDoc } from '@/data/documents'
import { countyName } from '@/domain/counties/counties'
import { PRODUCTS } from '@/data/catalog'
import { slaHours } from '@/domain/assignment/sla'
import { arrivalById, board, previewAssign, type Exception, type RunResult } from '@/domain/assignment/engine'
import { arrivalAsOrder } from '@/domain/assignment/workload'
import type { Arrival } from '@/domain/assignment/day'
import { now } from '@/shared/lib/clock'
import { iso, midnight } from '@/shared/lib/format'
import { ASSIGN_STAGES } from '@/data/org'
import { createStore, useStore } from '@/shared/lib/store'
import { can, refusal, type Actor } from '@/domain/auth/permissions'
import { QC_CRITERIA, QC_SCALE } from '@/domain/quality/quality'
import type { Assignments, Order, OrderStatus, Person } from '@/data/types'

interface OrderCost {
  id: string
  what: string
  amt: number
  by: string
  at: Date
}

interface OrderNote {
  id: string
  at: Date
  by: string
  text: string
  defect?: boolean
}


export interface OrderEdits {
  pr?: string
  stt?: OrderStatus
  bw?: string
  ef?: string
  oe?: string
  pi?: string
  la?: string
  ad?: string
  nr?: string
  vs?: string
  ld?: string
}

export interface OrderEvent {
  at: Date
  by: string
  what: string
  detail: string
}

export type QcField = (typeof QC_CRITERIA)[number][1]

export interface StageRating {
  who: string
  scores: Partial<Record<QcField, number>>
  comment: string
}

export interface StoredRating extends StageRating {
  by: string
  at: Date
}

interface Working {
  edits: OrderEdits
  docs?: OrderDoc[]
  assign?: Assignments
  costs: OrderCost[]
  notes: OrderNote[]
  ratings?: Record<string, StoredRating>
  events: OrderEvent[]
  sentAt?: Date
}

const EMPTY: Working = { edits: {}, costs: [], notes: [], events: [] }

export function logged(w: Working, event: Omit<OrderEvent, 'at'>, collapse = false): OrderEvent[] {
  const last = w.events[w.events.length - 1]
  const next = { ...event, at: now() }
  if (collapse && last && last.what === event.what && last.by === event.by) {
    return [...w.events.slice(0, -1), next]
  }
  return [...w.events, next]
}

const store = createStore<Record<string, Working>>({})

const created = createStore<Order[]>([])

const intakeHeld = createStore<Exception[]>([])

export const useOrderState = (): Record<string, Working> => useStore(store)

export const workingOn = (id: string): Working => store.get()[id] ?? EMPTY

export const orderStates = (): Readonly<Record<string, Working>> => store.get()

export const change = (id: string, fn: (w: Working) => Working) =>
  store.update((state) => ({ ...state, [id]: fn(state[id] ?? EMPTY) }))


export type { OrderDoc }

export const docsOf = (id: string): OrderDoc[] => store.get()[id]?.docs ?? SEED_DOCS

export type OrderActor = Pick<Person, 'id' | 'r' | 'n'>

export type EditedOrder = Order & OrderEdits

export function orderById(id: string): Order | undefined {
  const known = created.get().find((o) => o.id === id) ?? ORDERS.find((o) => o.id === id)
  if (known) return known
  const arrival = arrivalById(id)
  return arrival ? arrivalAsOrder(arrival, slaHours(arrival)) : undefined
}

export const arrivalOrder = (a: Arrival): EditedOrder => orderAsEdited(arrivalAsOrder(a, slaHours(a)))

export function nextOrderId(): string {
  const top = Math.max(0, ...allOrders().map((o) => Number(o.id.split('-')[0]) || 0))
  return `${top + 1}-1`
}

export const asArrival = (o: Pick<Order, 'id' | 'recv' | 'pr' | 'st' | 'cl' | 'co'>): Arrival => ({
  id: o.id,
  hr: o.recv.getHours(),
  date: midnight(o.recv),
  dk: iso(o.recv),
  today: iso(o.recv) === iso(now()),
  recv: o.recv,
  pr: o.pr,
  st: o.st,
  cl: o.cl,
  co: o.co,
})

export function pipelineLoad(): Record<string, number> {
  const load = { ...board().run.load }
  for (const o of created.get()) {
    const a = orderAsEdited(o).a
    for (const s of ASSIGN_STAGES) {
      const who = a[s]
      if (who) load[who] = (load[who] ?? 0) + 1
    }
  }
  return load
}

export function addOrder(actor: OrderActor, order: Order): string | null {
  const refused = refusal(actor, 'all', 'Taking in a new order')
  if (refused) return refused
  const arrival = asArrival(order)
  const slots = previewAssign({ pr: order.pr, st: order.st, cl: order.cl, co: order.co || null }, pipelineLoad())
  const a: Assignments = { ...order.a }
  const held: Exception[] = []
  for (const stage of ASSIGN_STAGES) {
    const slot = slots[stage]
    if (a[stage] || !slot) continue
    if (slot.who !== undefined) a[stage] = slot.who
    else held.push({ o: arrival, stage, dk: arrival.dk, today: arrival.today, why: slot.why, t: slot.t, trace: slot.trace })
  }
  created.update((list) => [{ ...order, a }, ...list])
  intakeHeld.update((list) => [...held, ...list])
  return null
}

const SEEDED = new Set(ORDERS.map((o) => o.id))

export const cameThroughIntake = (o: Pick<Order, 'id'>): boolean => !SEEDED.has(o.id)

export function allOrders(): EditedOrder[] {
  const seeded = new Set(ORDERS.map((o) => o.id))
  const run = board()
    .run.orders.filter((a) => !seeded.has(a.id))
    .map((a) => arrivalAsOrder(a, slaHours(a)))
  return [...created.get(), ...ORDERS, ...run].map((o) => orderAsEdited(o))
}

export const mayOpenOrder = (viewer: Actor, o: Pick<Order, 'a'>): boolean =>
  can(viewer, 'all') || Object.values(o.a).includes(viewer.id)

export const ordersFor = <T extends Pick<Order, 'a'>>(viewer: Actor, orders: readonly T[]): T[] =>
  orders.filter((o) => mayOpenOrder(viewer, o))

export const orderLabel = (o: Pick<Order, 'id' | 'pr' | 'prop'>): string => [o.id, o.pr, o.prop].filter(Boolean).join(' — ')

export const assigneeOn = (id: string, stage: string): string | undefined => {
  const o = orderById(id)
  return (o && orderAsEdited(o).a[stage]) || undefined
}

const stillOpen = (e: Exception): boolean => !assigneeOn(e.o.id, e.stage)

export function openExceptions(): Exception[] {
  return [...intakeHeld.get(), ...board().run.exc].filter((e) => e.today && stillOpen(e))
}

export function pipelineToday(): { orders: Arrival[]; placed: number; open: number } {
  const orders = [...board().run.today, ...created.get().map(asArrival).filter((o) => o.today)]
  const open = openExceptions().length
  return { orders, placed: orders.length * ASSIGN_STAGES.length - open, open }
}

export function placementOf(run: RunResult): { placed: number; open: number } {
  const held = run.exc.filter((e) => e.today)
  const open = held.filter(stillOpen).length
  return { placed: run.assigns.filter((a) => a.today).length + held.length - open, open }
}

export function useOrders(): EditedOrder[] {
  useStore(created)
  useStore(intakeHeld)
  useStore(store)
  return allOrders()
}

export function orderAsEdited(base: Order, w: Working = workingOn(base.id)): EditedOrder {
  const merged: EditedOrder = { ...base, ...w.edits, a: w.assign ?? base.a }
  if (w.edits.pr && w.edits.pr !== base.pr) {
    merged.fee = PRODUCTS.find((p) => p.id === w.edits.pr)?.fee ?? base.fee
    merged.due = new Date(base.recv.getTime() + slaHours(merged) * 36e5)
  }
  if (w.edits.stt) merged.done = w.edits.stt === 'sent'
  if (w.sentAt) merged.sentAt = w.sentAt
  return merged
}

export interface OrderParties {
  borrower: string
  effective: string
  priorEffective: string
  parcel: string
  loanAmount: string
  address: string
  namesRun: string
  vesting: string
  legal: string
}

export function partiesOf(o: Order, w: Working = workingOn(o.id)): OrderParties {
  const e = w.edits
  return {
    borrower: e.bw ?? o.buyer ?? '',
    effective: e.ef ?? o.eff ?? '',
    priorEffective: e.oe ?? '',
    parcel: e.pi ?? o.parcel ?? '',
    loanAmount: e.la ?? '',
    address: e.ad ?? [o.prop, countyName(o.co, o.st), o.st].filter(Boolean).join(', '),
    namesRun: e.nr ?? '',
    vesting: e.vs ?? '',
    legal: e.ld ?? '',
  }
}

const ON_SCALE = new Set(QC_SCALE.map(([score]) => score))

export const ratingComplete = (r: StageRating | undefined): boolean =>
  !!r && QC_CRITERIA.every(([, f]) => ON_SCALE.has(r.scores[f] ?? 0))

export const ratingAverage = (r: StageRating): number =>
  QC_CRITERIA.reduce((a, [, f]) => a + (r.scores[f] ?? 0), 0) / QC_CRITERIA.length

export const ratingsOf = (id: string): Record<string, StoredRating> => workingOn(id).ratings ?? {}

export function resetOrders(): void {
  store.reset()
  created.reset()
  intakeHeld.reset()
}
