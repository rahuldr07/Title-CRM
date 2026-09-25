import { createStore, useStore } from '@/shared/lib/store'
import type { Client } from '@/data/types'
import { CLIENT_EDITOR, currentClients } from '@/domain/company/clients'
import { refusal, type Actor } from '@/domain/auth/permissions'

const defaultsFor = (c: Client) => [`${c.dn}MI-`, `${c.dn}PA-`, `${c.dn}FL-`, `${c.dn}WV-`]

const seed = (): Record<string, string[]> =>
  Object.fromEntries(currentClients().map((c) => [c.n, defaultsFor(c)]))

const store = createStore<Record<string, string[]>>(seed())

export const usePrefixes = (): Record<string, string[]> => useStore(store)

export function clashOf(value: string, exceptClient?: string): [client: string, prefix: string] | null {
  for (const [client, list] of Object.entries(store.get())) {
    for (const p of list) {
      if (client === exceptClient && p === value) continue
      if (p === value || p.startsWith(value) || value.startsWith(p)) return [client, p]
    }
  }
  return null
}

const prefixRefusal = (actor: Actor) => refusal(actor, CLIENT_EDITOR, 'Changing a client’s order-number prefixes')

export function addPrefix(actor: Actor, clientName: string, value: string): string | null {
  const refused = prefixRefusal(actor)
  if (refused) return refused
  store.update((prefixes) => ({
    ...prefixes,
    [clientName]: [...(prefixes[clientName] ?? []), value],
  }))
  return null
}

export function removePrefix(actor: Actor, clientName: string, value: string): string | null {
  const refused = prefixRefusal(actor)
  if (refused) return refused
  store.update((prefixes) => ({
    ...prefixes,
    [clientName]: (prefixes[clientName] ?? []).filter((p) => p !== value),
  }))
  return null
}
