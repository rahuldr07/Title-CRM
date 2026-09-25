import { stageName } from '@/domain/company/naming'
import { STAGE_STATUS, curIdx, curStageOf, slaRuleFor, slaText } from '@/domain/assignment/sla'
import { wouldSelfReview } from '@/domain/assignment/narrow'
import { now } from '@/shared/lib/clock'
import { personById, whoName } from '@/domain/people/roster'
import { statusName } from '@/domain/company/statuses'
import { ASSIGN_STAGES, PAIRS } from '@/data/org'
import { can, refusal } from '@/domain/auth/permissions'
import type { Assignments, OrderStatus } from '@/data/types'
import { change, docsOf, mayOpenOrder, logged, orderAsEdited, orderById, type OrderActor, type OrderDoc, type OrderEdits } from './orders'
import { sendingRefusal } from './ratings'
import { dayLoadOf } from './dayLoad'
import { currentRules } from '@/domain/assignment/rules'
import { statusRefusal } from './statusMoves'

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

const TARGET_RULE = 'r3'

const HEADER: readonly (keyof OrderEdits)[] = ['pr', 'bw', 'ad', 'la']

const EVERY = 'someone who sees every order (the “all” capability)'

export function stageWorkRefusal(actor: OrderActor, id: string, doing: string): string | null {
  const base = orderById(id)
  if (!base) return 'That order is not here.'
  if (can(actor, 'all')) return null
  const o = orderAsEdited(base)
  if (!mayOpenOrder(actor, o)) return `${id} is not assigned to you, so it is not yours to change. Someone who sees every order (the “all” capability) can.`
  const cur = o.done ? null : curStageOf(o)
  if (cur && o.a[cur] === actor.id) return null
  if (!cur) return `${id} has been sent, so ${doing} is closed to the people who worked it; ${EVERY} still can.`
  const holder = o.a[cur]
  return `${id} is on ${stageName(cur)}${holder ? `, which is ${whoName(holder)}’s` : ', which nobody holds yet'}, so ${doing} is for whoever holds that stage while the order is there. You can again when it reaches a stage you hold; ${EVERY} can at any time.`
}

export const headerRefusal = (actor: OrderActor): string | null =>
  refusal(actor, 'all', 'Changing an order’s product, borrower, property address or loan amount')

export const FINDINGS_WORK = 'editing what the search found'

function fieldRefusal(actor: OrderActor, id: string, key: keyof OrderEdits): string | null {
  if (HEADER.includes(key)) return headerRefusal(actor)
  if (key === 'stt') return stageWorkRefusal(actor, id, 'moving its status')
  return stageWorkRefusal(actor, id, FINDINGS_WORK)
}

function selfReviewAt(assign: Readonly<Record<string, string | null | undefined>>, stage: string, personId: string): string | null {
  return wouldSelfReview(assign, stage, personId) ?? Object.entries(PAIRS).find(([qc, work]) => work === stage && assign[qc] === personId)?.[0] ?? null
}

const selfReviewRefusal = (stage: string, personId: string, paired: string) =>
  `${whoName(personId)} is on ${stageName(paired)}, so giving them ${stageName(stage)} as well would have them check their own work.`

export const DOC_WORK = 'adding or editing its documents'

export function addDoc(actor: OrderActor, id: string): string | null {
  const refused = stageWorkRefusal(actor, id, DOC_WORK)
  if (refused) return refused
  change(id, (w) => {
    const docs = w.docs ?? docsOf(id)
    return {
      ...w,
      docs: [
        ...docs,
        { id: `d${docs.length + 1}`, kind: '', recorded: '', bookPage: '', instrument: '', image: false, extraction: 'none' },
      ],
    }
  })
  return null
}

export function setDoc<K extends keyof OrderDoc>(
  actor: OrderActor,
  id: string,
  docId: string,
  key: K,
  value: OrderDoc[K],
): string | null {
  const refused = stageWorkRefusal(actor, id, DOC_WORK)
  if (refused) return refused
  change(id, (w) => ({
    ...w,
    docs: (w.docs ?? docsOf(id)).map((d) => (d.id === docId ? { ...d, [key]: value } : d)),
  }))
  return null
}

function productDetail(id: string, pr: string): string {
  const base = orderById(id)
  if (!base) return pr
  const was = orderAsEdited(base)
  const rule = slaRuleFor(was.cl, pr)
  return `${was.pr} → ${pr} · ${slaText(rule, new Date(was.recv.getTime() + rule.h * 36e5), 'due ')}`
}

const fieldDetail = (id: string, key: keyof OrderEdits, value: unknown): string =>
  key === 'la' ? '' : key === 'stt' ? statusName(String(value)) : key === 'pr' ? productDetail(id, String(value)) : String(value ?? '')

const TYPED: readonly (keyof OrderEdits)[] = ['bw', 'ef', 'oe', 'pi', 'la', 'ad', 'nr', 'vs', 'ld']

export function setOrderField<K extends keyof OrderEdits>(
  actor: OrderActor,
  id: string,
  key: K,
  value: OrderEdits[K],
): string | null {
  const refused = key === 'stt' ? statusRefusal(actor, id, String(value)) : fieldRefusal(actor, id, key)
  if (refused) return refused
  const detail = fieldDetail(id, key, value)
  change(id, (w) => ({
    ...w,
    edits: { ...w.edits, [key]: value },
    events: logged(w, { by: actor.n, what: `${FIELD[key]} edited`, detail }, TYPED.includes(key)),
    ...(key === 'stt' && value === 'sent' ? { sentAt: now() } : {}),
  }))
  return null
}

export function targetBreach(id: string, stage: string, personId: string): string | null {
  if (!currentRules().find((r) => r.id === TARGET_RULE)?.on) return null
  const person = personById(personId)
  const base = orderById(id)
  if (!person || (base && orderAsEdited(base).a[stage] === personId)) return null
  const { load } = dayLoadOf(person)
  if (load < person.cap) return null
  return `${person.n} is at ${load} of a ${person.cap} target today, so giving them ${id} as well puts them over it. The engine stops at the target, which is why it left this stage for a person; confirm to give it to them anyway, or pick someone with room.`
}

export function setAssignee(
  actor: OrderActor,
  id: string,
  stage: string,
  personId: string | null,
  { overTarget = false }: { overTarget?: boolean } = {},
): string | null {
  const refused = refusal(actor, 'assign', 'Assigning work')
  if (refused) return refused
  const base = orderById(id)
  const current = base ? orderAsEdited(base).a : {}
  const paired = personId ? selfReviewAt(current, stage, personId) : null
  if (personId && paired) return selfReviewRefusal(stage, personId, paired)
  const over = personId && !overTarget ? targetBreach(id, stage, personId) : null
  if (over) return over
  const by = actor.n
  change(id, (w) => ({
    ...w,
    assign: { ...(w.assign ?? base?.a ?? {}), [stage]: personId },
    events: logged(w, {
      by,
      what: personId ? `Assigned · ${stageName(stage)}` : `Unassigned · ${stageName(stage)}`,
      detail: personId ? whoName(personId) : '',
    }),
  }))
  return null
}

export function setAssignments(actor: OrderActor, id: string, next: Assignments): string | null {
  const refused = refusal(actor, 'assign', 'Assigning work')
  if (refused) return refused
  for (const [stage, personId] of Object.entries(next)) {
    const paired = personId ? selfReviewAt({ ...next, [stage]: null }, stage, personId) : null
    if (personId && paired) return selfReviewRefusal(stage, personId, paired)
  }
  const n = Object.values(next).filter(Boolean).length
  change(id, (w) => ({
    ...w,
    assign: next,
    events: logged(w, { by: actor.n, what: 'Assigned by the rules', detail: `${n} stage${n === 1 ? '' : 's'}` }),
  }))
  return null
}

export function addCost(actor: OrderActor, id: string, what: string, amt: number): string | null {
  const refused = refusal(actor, 'pricing', 'Adding a cost to an order')
  if (refused) return refused
  const by = actor.n
  change(id, (w) => ({
    ...w,
    costs: [...w.costs, { id: `C${w.costs.length + 1}`, what, amt, by, at: now() }],
    events: logged(w, { by, what: 'Cost added', detail: what }),
  }))
  return null
}

export const NOTE_WORK = 'adding a note'

export function addNote(actor: OrderActor, id: string, text: string, defect = false): string | null {
  const refused = stageWorkRefusal(actor, id, NOTE_WORK)
  if (refused) return refused
  const by = actor.n
  change(id, (w) => ({
    ...w,
    notes: [{ id: `N${w.notes.length + 1}`, at: now(), by, text, defect }, ...w.notes],
    events: logged(w, { by, what: defect ? 'Defect recorded' : 'Note added', detail: text }),
  }))
  return null
}

export type Finish = { done: true; from: string; to: string } | { done: false; why: string }

export function finishStage(actor: OrderActor, id: string): Finish {
  const base = orderById(id)
  if (!base) return { done: false, why: 'That order is not here.' }
  const o = orderAsEdited(base)
  const i = curIdx(o)
  if (i >= ASSIGN_STAGES.length) return { done: false, why: `${o.id} has already been sent.` }
  const from = ASSIGN_STAGES[i]
  if (from && o.a[from] !== actor.id && !can(actor, 'assign')) {
    return { done: false, why: `${stageName(from)} on ${o.id} is ${whoName(o.a[from])}’s to finish. Someone who assigns work can finish it for them.` }
  }
  const by = actor.n
  if (!from || STAGE_STATUS[from] !== o.stt) {
    return { done: false, why: `${o.id} is on ${statusName(o.stt)}, which is cleared on the order rather than finished here.` }
  }
  const next = ASSIGN_STAGES[i + 1]
  const unrated = next ? null : sendingRefusal(id)
  if (unrated) return { done: false, why: unrated }
  const to: OrderStatus = next ? (STAGE_STATUS[next] ?? 'sent') : 'sent'
  const owner = next ? o.a[next] : null
  change(id, (w) => ({
    ...w,
    edits: { ...w.edits, stt: to },
    ...(to === 'sent' ? { sentAt: now() } : {}),
    events: logged(w, {
      by,
      what: `${stageName(from)} finished`,
      detail: next ? `Handed to ${stageName(next)}${owner ? ` — ${whoName(owner)}` : ', which has nobody on it'}` : 'Sent to the client',
    }),
  }))
  return { done: true, from, to: next ?? 'Sent' }
}
