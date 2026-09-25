import { UPDATES } from '@/data/production'
import { now } from '@/shared/lib/clock'
import { createStore, useStore } from '@/shared/lib/store'
import type { Person, Update } from '@/data/types'
import { personById } from '@/domain/people/roster'

const store = createStore<Update[]>(UPDATES)

export const useUpdates = (): Update[] => useStore(store)

export const fromYourDepartment = (updates: Update[], me: Person): Update[] =>
  updates.filter(
    (u) =>
      u.who !== me.id &&
      (personById(u.who)?.dep ?? []).some((d) => me.dep.includes(d)),
  )

export function postUpdate(who: string, kind: Update['kind'], body: string): Update {
  const entry: Update = { id: `U${9000 + store.get().length}`, who, d: now(), kind, b: body }
  store.update((prev) => [entry, ...prev])
  return entry
}
