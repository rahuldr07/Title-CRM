import { UPDATES } from '@/data/production'
import { STAFF } from '@/data/people'
import { now } from '@/lib/clock'
import { createStore, useStore } from '@/lib/store'
import type { Person, Update } from '@/data/types'

const store = createStore<Update[]>(UPDATES)

export const useUpdates = (): Update[] => useStore(store)

/** Updates from anyone else who shares a department with `me` — what "Needs you" lists. */
export const fromYourDepartment = (updates: Update[], me: Person): Update[] =>
  updates.filter(
    (u) =>
      u.who !== me.id &&
      (STAFF.find((x) => x.id === u.who)?.dep ?? []).some((d) => me.dep.includes(d)),
  )

export function postUpdate(who: string, kind: Update['kind'], body: string): Update {
  const entry: Update = { id: `U${9000 + store.get().length}`, who, d: now(), kind, b: body }
  store.update((prev) => [entry, ...prev])
  return entry
}

export const resetUpdates = store.reset
