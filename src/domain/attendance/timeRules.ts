import { TIMECFG } from '@/data/hrms'
import { createStore, useStore } from '@/shared/lib/store'
import { refusal, type Actor } from '@/domain/auth/permissions'

export type TimeRules = typeof TIMECFG

const store = createStore<TimeRules>(TIMECFG)

export const currentTimeRules = (): TimeRules => store.get()
export const useTimeRules = (): TimeRules => useStore(store)

export function setTimeRule<K extends keyof TimeRules>(actor: Actor, k: K, v: TimeRules[K]): string | null {
  const refused = refusal(actor, 'people', 'Changing the attendance and overtime rules')
  if (refused) return refused
  store.update((s) => ({ ...s, [k]: v }))
  return null
}

export const resetTimeRules = store.reset
