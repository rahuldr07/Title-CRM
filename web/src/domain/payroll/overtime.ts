import { OT, type Overtime } from '@/data/hrms'
import { createStore, useStore } from '@/shared/lib/store'
import { OWN_REQUEST, decidesOwn, refusal, type Actor } from '@/domain/auth/permissions'
import type { Person } from '@/data/types'
import { currentDateFormat, parseDate, usDate } from '@/shared/lib/format'

const store = createStore<Overtime[]>(OT.map((o) => ({ ...o })))

export const useOvertime = (): Overtime[] => useStore(store)

export const currentOvertime = (): Overtime[] => store.get()

const OVERTIME_DECIDER = 'all'

export function claimOvertime(actor: Actor, personId: string, d: string, minutes: number, why: string): string | null {
  if (actor.id !== personId) return 'Overtime is claimed by the person who worked it.'
  const day = parseDate(d)
  if (Number.isNaN(day.getTime())) return `Write the day as ${currentDateFormat()}.`
  store.update((list) => [
    { id: `O${9000 + list.length}`, who: personId, d: usDate(day), mins: minutes, why, st: 'pending', by: null },
    ...list,
  ])
  return null
}

export function decideOvertime(
  decider: Pick<Person, 'id' | 'n' | 'r'>,
  id: string,
  st: 'approved' | 'rejected',
): string | null {
  const o = store.get().find((x) => x.id === id)
  if (!o) return 'That claim is no longer waiting.'
  if (decidesOwn([o.who], decider.id)) return OWN_REQUEST
  const refused = refusal(decider, OVERTIME_DECIDER, 'Deciding an overtime claim')
  if (refused) return refused
  store.update((list) => list.map((x) => (x.id === id ? { ...x, st, by: decider.n } : x)))
  return null
}
