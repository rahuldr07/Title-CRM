import { nextId } from '@/shared/lib/ids'
import { COUNTS, PETTY, PETTYCFG } from '@/data/hrms'
import { createStore, useStore } from '@/shared/lib/store'
import type { PettyConfig, PettyCount, PettyEntry } from '@/data/types'
import { refusal, type Actor } from '@/domain/auth/permissions'

const PETTY_CAPABILITY = 'pricing'

const pettyRefusal = (actor: Actor) => refusal(actor, PETTY_CAPABILITY, 'Changing the petty-cash book')

interface Box {
  entries: PettyEntry[]
  counts: PettyCount[]
  cfg: PettyConfig
}

const store = createStore<Box>({ entries: PETTY, counts: COUNTS, cfg: PETTYCFG })

export const useBox = (): Box => useStore(store)

export function recordEntry(actor: Actor, e: Omit<PettyEntry, 'id'>): PettyEntry | string {
  const refused = pettyRefusal(actor)
  if (refused) return refused
  const entry: PettyEntry = { ...e, id: nextId('P', store.get().entries.map((x) => x.id)) }
  store.update((box) => ({ ...box, entries: [...box.entries, entry] }))
  return entry
}

export function recordCount(actor: Actor, c: Omit<PettyCount, 'id'>): string | null {
  const refused = pettyRefusal(actor)
  if (refused) return refused
  store.update((box) => ({
    ...box,
    counts: [{ ...c, id: nextId('C', box.counts.map((x) => x.id)) }, ...box.counts],
  }))
  return null
}

export function setConfig<K extends keyof PettyConfig>(actor: Actor, key: K, value: PettyConfig[K]): string | null {
  const refused = pettyRefusal(actor)
  if (refused) return refused
  store.update((box) => ({ ...box, cfg: { ...box.cfg, [key]: value } }))
  return null
}
