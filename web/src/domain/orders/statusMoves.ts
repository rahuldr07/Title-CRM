import { stageName } from '@/domain/company/naming'
import { ASSIGN_STAGES } from '@/data/org'
import type { OrderStatus } from '@/data/types'
import { STAGE_STATUS, curStageOf } from '@/domain/assignment/sla'
import { can, refusal } from '@/domain/auth/permissions'
import { currentStatuses, statusName } from '@/domain/company/statuses'
import { whoName } from '@/domain/people/roster'
import { orderAsEdited, orderById, type EditedOrder, type OrderActor } from './orders'
import { sendingRefusal } from './ratings'

const LAST = ASSIGN_STAGES[ASSIGN_STAGES.length - 1] ?? ''

const EVERY = 'someone who sees every order (the “all” capability)'

function ownMoves(actor: OrderActor, o: EditedOrder): string[] {
  const cur = curStageOf(o)
  if (!cur || o.a[cur] !== actor.id) return []
  const next = ASSIGN_STAGES[ASSIGN_STAGES.indexOf(cur) + 1]
  return [STAGE_STATUS[cur], next ? STAGE_STATUS[next] : 'sent'].filter((k): k is OrderStatus => !!k)
}

function movesWhy(actor: OrderActor, o: EditedOrder): string {
  const cur = curStageOf(o)
  const own = ownMoves(actor, o)
  const onward = own[own.length - 1]
  if (onward && cur)
    return `You hold ${stageName(cur)}, so you can move ${o.id} on to ${statusName(onward)} when your part is done. Cancelling it, holding it or moving it anywhere else is for ${EVERY}.`
  const holder = cur ? o.a[cur] : null
  return `${o.id} is on ${cur ? stageName(cur) : statusName(o.stt)}${holder ? `, which is ${whoName(holder)}’s` : ''}, so its status is not yours to move. You can move an order on from a stage you hold while it is on that stage; anything else is for ${EVERY}.`
}

function refusalOn(actor: OrderActor, o: EditedOrder, next: string): string | null {
  if (next === o.stt) return null
  if (next === 'canc') {
    const refused = refusal(actor, 'all', 'Cancelling an order')
    if (refused) return refused
  }
  if (next === 'sent') {
    if (!can(actor, 'all') && o.a[LAST] !== actor.id)
      return `Marking ${o.id} Sent is for whoever holds ${LAST} on it${o.a[LAST] ? ` (${whoName(o.a[LAST])})` : ''}, or ${EVERY}.`
    if (!can(actor, 'all') && !ownMoves(actor, o).includes('sent')) return movesWhy(actor, o)
    return sendingRefusal(o.id)
  }
  if (can(actor, 'all') || ownMoves(actor, o).includes(next)) return null
  return movesWhy(actor, o)
}

export function statusRefusal(actor: OrderActor, id: string, next: string): string | null {
  const base = orderById(id)
  return base ? refusalOn(actor, orderAsEdited(base), next) : 'That order is not here.'
}

export function statusChoices(actor: OrderActor, o: EditedOrder): { keys: string[]; why: string | null } {
  const keys = currentStatuses()
    .map(([k]) => k)
    .filter((k) => refusalOn(actor, o, k) === null)
  const whys = [can(actor, 'all') ? null : movesWhy(actor, o), keys.includes('sent') || o.stt === 'sent' ? null : sentWhy(actor, o)]
  const why = [...new Set(whys.filter((w): w is string => !!w))].join(' ')
  return { keys, why: why || null }
}

function sentWhy(actor: OrderActor, o: EditedOrder): string | null {
  const refused = refusalOn(actor, o, 'sent')
  return refused && (can(actor, 'all') || ownMoves(actor, o).includes('sent')) ? refused : null
}
