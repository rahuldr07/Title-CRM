import { LEADS, STALE_BAD, STALE_WARN } from '@/data/business'
import { daysSince } from '@/shared/lib/format'
import { createStore, useStore } from '@/shared/lib/store'
import { refusal, type Actor, type Saved } from '@/domain/auth/permissions'
import type { Lead } from '@/data/types'

const store = createStore<Lead[]>(LEADS)

export const currentLeads = (): Lead[] => store.get()
export const useLeads = (): Lead[] => useStore(store)
export const leadById = (id: string, leads: readonly Lead[] = currentLeads()): Lead | undefined =>
  leads.find((l) => l.id === id)

const LEAD_CAPABILITY = 'pricing'

const leadRefusal = (actor: Actor) => refusal(actor, LEAD_CAPABILITY, 'Changing a lead')

const nextLeadId = () => {
  let n = 1
  while (currentLeads().some((l) => l.id === `l${n}`)) n++
  return `l${n}`
}

export function addLead(actor: Actor, lead: Omit<Lead, 'id'>): Saved {
  const refused = leadRefusal(actor)
  if (refused) return { id: null, refused }
  const id = nextLeadId()
  store.update((all) => [{ ...lead, id }, ...all])
  return { id, refused: null }
}

export function updateLead(actor: Actor, id: string, fn: (l: Lead) => Lead): string | null {
  const refused = leadRefusal(actor)
  if (refused) return refused
  if (!leadById(id)) return 'That lead is no longer in the book.'
  store.update((all) => all.map((l) => (l.id === id ? fn(l) : l)))
  return null
}

export const resetLeads = store.reset

export const lastTouch = (l: Lead) =>
  l.notes.reduce((a, n) => (n.at > a ? n.at : a), l.notes[0]?.at ?? new Date(0))

export const leadAge = (l: Lead) => daysSince(lastTouch(l))

export const isStale = (l: Lead) =>
  !['won', 'lost', 'notnow'].includes(l.st) && leadAge(l) >= STALE_WARN

export type Staleness = 'ok' | 'warn' | 'bad'

export const staleness = (l: Lead): Staleness => {
  if (['won', 'lost', 'notnow'].includes(l.st)) return 'ok'
  const age = leadAge(l)
  return age >= STALE_BAD ? 'bad' : age >= STALE_WARN ? 'warn' : 'ok'
}

export const needsFollowUp = (l: Lead) => !['won', 'lost'].includes(l.st) && (l.flag || isStale(l))

export const followUpCount = (leads: readonly Lead[] = currentLeads()) => leads.filter(needsFollowUp).length
