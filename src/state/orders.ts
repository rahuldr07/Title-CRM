import { ORDERS } from '@/data/production'
import { countyName } from '@/lib/format'
import { PRODUCTS } from '@/data/catalog'
import { STAGE_STATUS, curIdx, slaHours } from '@/lib/sla'
import { arrivalAsOrder, arrivalById, board, type Exception } from '@/lib/engine'
import { now } from '@/lib/clock'
import { createStore, useStore } from '@/lib/store'
import { whoName } from '@/lib/permissions'
import { ASSIGN_STAGES, STATUS } from '@/data/org'
import type { Assignments, Order, OrderStatus } from '@/data/types'

export interface OrderCost {
  id: string
  what: string
  amt: number
  by: string
  at: Date
}

export interface OrderNote {
  id: string
  at: Date
  by: string
  text: string
  defect?: boolean
}

export interface OrderDoc {
  id: string
  kind: string
  recorded: string
  bookPage: string
  instrument: string
  image: boolean
  extraction: 'verified' | 'review' | 'none'
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

interface Working {
  edits: OrderEdits
  docs?: OrderDoc[]
  assign?: Assignments
  costs: OrderCost[]
  notes: OrderNote[]
  rated: boolean
  events: OrderEvent[]
}

const EMPTY: Working = { edits: {}, costs: [], notes: [], rated: false, events: [] }

const FIELD: Record<keyof OrderEdits, string> = {
  pr: 'Product',
  stt: 'Stage',
  bw: 'Borrower',
  ef: 'Effective date',
  oe: 'Prior effective date',
  pi: 'Parcel ID',
  la: 'Loan amount',
  ad: 'Property address',
  nr: 'Names run',
  vs: 'Vesting',
  ld: 'Legal description',
}

/* Field edits arrive a keystroke at a time, so a run of them on one field by one
   person is one entry holding the final value; anything else is its own entry. */
function logged(w: Working, event: Omit<OrderEvent, 'at'>, collapse = false): OrderEvent[] {
  const last = w.events[w.events.length - 1]
  const next = { ...event, at: now() }
  if (collapse && last && last.what === event.what && last.by === event.by) {
    return [...w.events.slice(0, -1), next]
  }
  return [...w.events, next]
}

const store = createStore<Record<string, Working>>({})

/* Orders taken on the New order form. Kept here rather than pushed onto the seed
   register, which every other screen and test reads as fixed. */
const created = createStore<Order[]>([])

export const useOrderState = (): Record<string, Working> => useStore(store)

export const workingOn = (id: string): Working => store.get()[id] ?? EMPTY

const change = (id: string, fn: (w: Working) => Working) =>
  store.update((state) => ({ ...state, [id]: fn(state[id] ?? EMPTY) }))

export const SEED_DOCS: OrderDoc[] = [
  { id: 'd1', kind: 'Mortgage', recorded: '12/17/2025', bookPage: '736/935', instrument: '2025-002688', image: true, extraction: 'verified' },
  { id: 'd2', kind: 'Administrator’s Deed', recorded: '12/17/2025', bookPage: '736/932', instrument: '2025-002687', image: true, extraction: 'verified' },
  { id: 'd3', kind: 'Scrivener’s Affidavit', recorded: '01/14/2026', bookPage: '738/76', instrument: '2026-000096', image: true, extraction: 'review' },
]

export const docsOf = (id: string): OrderDoc[] => store.get()[id]?.docs ?? SEED_DOCS

export function addDoc(id: string): void {
  change(id, (w) => {
    const docs = w.docs ?? SEED_DOCS
    return {
      ...w,
      docs: [
        ...docs,
        { id: `d${docs.length + 1}`, kind: '', recorded: '', bookPage: '', instrument: '', image: false, extraction: 'none' },
      ],
    }
  })
}

export function setDoc<K extends keyof OrderDoc>(id: string, docId: string, key: K, value: OrderDoc[K]): void {
  change(id, (w) => ({
    ...w,
    docs: (w.docs ?? SEED_DOCS).map((d) => (d.id === docId ? { ...d, [key]: value } : d)),
  }))
}

export type EditedOrder = Order & OrderEdits

/** New orders, then the seed register, then today's assignment run — every place an order lives. */
export function orderById(id: string): Order | undefined {
  const known = created.get().find((o) => o.id === id) ?? ORDERS.find((o) => o.id === id)
  if (known) return known
  const arrival = arrivalById(id)
  return arrival ? arrivalAsOrder(arrival, slaHours(arrival)) : undefined
}

/* One past the highest order number anywhere, so a new order can collide with
   neither the seed register nor today's run. */
export function nextOrderId(): string {
  const top = Math.max(0, ...allOrders().map((o) => Number(o.id.split('-')[0]) || 0))
  return `${top + 1}-1`
}

export function addOrder(order: Order): void {
  created.update((list) => [order, ...list])
}

/* Every screen that counts or lists orders reads this, so the dashboard, the
   register, assignment and the reports cannot each count a different set. */
export function allOrders(): EditedOrder[] {
  const seeded = new Set(ORDERS.map((o) => o.id))
  const run = board()
    .run.orders.filter((a) => !seeded.has(a.id))
    .map((a) => arrivalAsOrder(a, slaHours(a)))
  return [...created.get(), ...ORDERS, ...run].map((o) => orderAsEdited(o))
}

/* The day's unplaced stages that the order still has nobody on, so assigning one
   by hand — on the order or in the exceptions tab — takes it off the count. */
export function openExceptions(): Exception[] {
  return board().run.exc.filter((e) => {
    if (!e.today) return false
    const o = orderById(e.o.id)
    return !o || !orderAsEdited(o).a[e.stage]
  })
}

export function useOrders(): EditedOrder[] {
  useStore(created)
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

/* An edit, else what the order captured, else nothing. Never a sample value: a
   blank filled from another order is how John Doe's order opened as Sara Bahorik's. */
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

/* The loan amount stays out of the log's text, which roles without pricing can read. */
const fieldDetail = (key: keyof OrderEdits, value: unknown): string =>
  key === 'la' ? '' : key === 'stt' ? (STATUS[String(value)]?.[0] ?? String(value)) : String(value ?? '')

export const setOrderField = <K extends keyof OrderEdits>(id: string, key: K, value: OrderEdits[K], by = '') =>
  change(id, (w) => ({
    ...w,
    edits: { ...w.edits, [key]: value },
    events: logged(w, { by, what: `${FIELD[key]} edited`, detail: fieldDetail(key, value) }, true),
  }))

export function setAssignee(id: string, stage: string, personId: string | null, by = ''): void {
  const base = orderById(id)
  change(id, (w) => ({
    ...w,
    assign: { ...(w.assign ?? base?.a ?? {}), [stage]: personId },
    events: logged(w, {
      by,
      what: personId ? `Assigned · ${stage}` : `Unassigned · ${stage}`,
      detail: personId ? whoName(personId) : '',
    }),
  }))
}

export function setAssignments(id: string, next: Assignments, by = ''): void {
  const n = Object.values(next).filter(Boolean).length
  change(id, (w) => ({
    ...w,
    assign: next,
    events: logged(w, { by, what: 'Assigned by the rules', detail: `${n} stage${n === 1 ? '' : 's'}` }),
  }))
}

export function addCost(id: string, what: string, amt: number, by: string): void {
  change(id, (w) => ({
    ...w,
    costs: [...w.costs, { id: `C${w.costs.length + 1}`, what, amt, by, at: now() }],
    events: logged(w, { by, what: 'Cost added', detail: what }),
  }))
}

export function addNote(id: string, text: string, by: string, defect = false): void {
  change(id, (w) => ({
    ...w,
    notes: [{ id: `N${w.notes.length + 1}`, at: now(), by, text, defect }, ...w.notes],
    events: logged(w, { by, what: defect ? 'Defect recorded' : 'Note added', detail: text }),
  }))
}

export type Finish = { done: true; from: string; to: string } | { done: false; why: string }

/* The production seat's one action: hand the order to the next stage, or send it
   after the last. The rating rule is checked here, where the write happens, not
   only on the Quality tab that asks for the rating. */
export function finishStage(id: string, by: string, ratingRequired = false): Finish {
  const base = orderById(id)
  if (!base) return { done: false, why: 'That order is not here.' }
  const o = orderAsEdited(base)
  const i = curIdx(o)
  if (i >= ASSIGN_STAGES.length) return { done: false, why: `${o.id} has already been sent.` }
  const from = ASSIGN_STAGES[i]
  if (!from || STAGE_STATUS[from] !== o.stt) {
    const on = STATUS[o.stt]?.[0] ?? o.stt
    return { done: false, why: `${o.id} is on ${on}, which is cleared on the order rather than finished here.` }
  }
  const next = ASSIGN_STAGES[i + 1]
  if (!next && ratingRequired && !workingOn(id).rated) {
    return { done: false, why: 'QC ratings are required before an order is sent. Rate it on the Quality tab first.' }
  }
  const to: OrderStatus = next ? (STAGE_STATUS[next] ?? 'sent') : 'sent'
  const owner = next ? o.a[next] : null
  change(id, (w) => ({
    ...w,
    edits: { ...w.edits, stt: to },
    events: logged(w, {
      by,
      what: `${from} finished`,
      detail: next ? `Handed to ${next}${owner ? ` — ${whoName(owner)}` : ', which has nobody on it'}` : 'Sent to the client',
    }),
  }))
  return { done: true, from, to: next ?? 'Sent' }
}

export const markRated = (id: string, by = '') =>
  change(id, (w) => ({ ...w, rated: true, events: logged(w, { by, what: 'QC rated', detail: '' }) }))

export function resetOrders(): void {
  store.reset()
  created.reset()
}
