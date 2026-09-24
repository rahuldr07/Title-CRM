import { OT, type Overtime } from '@/data/hrms'
import { createStore, useStore } from '@/lib/store'
import { OWN_REQUEST, decidesOwn } from '@/lib/permissions'
import type { Person } from '@/data/types'

/* Overtime claims and their decisions, in one place that payroll reads too. The
   attendance screen used to approve a private copy while payroll read the bundled
   list, so no approval on screen was ever paid. */
const store = createStore<Overtime[]>(OT.map((o) => ({ ...o })))

export const useOvertime = (): Overtime[] => useStore(store)

export const currentOvertime = (): Overtime[] => store.get()

export function claimOvertime(personId: string, d: string, minutes: number, why: string): void {
  store.update((list) => [
    { id: `O${9000 + list.length}`, who: personId, d, mins: minutes, why, st: 'pending', by: null },
    ...list,
  ])
}

export function decideOvertime(
  id: string,
  st: 'approved' | 'rejected',
  decider: Pick<Person, 'id' | 'n'>,
): string {
  const o = store.get().find((x) => x.id === id)
  if (!o) return ''
  if (decidesOwn([o.who], decider.id)) return OWN_REQUEST
  store.update((list) => list.map((x) => (x.id === id ? { ...x, st, by: decider.n } : x)))
  return `Overtime ${st}`
}

export const resetOvertime = store.reset
