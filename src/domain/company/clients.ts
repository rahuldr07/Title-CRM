import { companyStore } from './companyStore'
import { useStoreSlice } from '@/shared/lib/store'
import { refusal, type Actor } from '@/domain/auth/permissions'
import type { Client } from '@/data/types'

export const CLIENT_EDITOR = 'pricing'

export const useClients = (): Client[] => useStoreSlice(companyStore, (c) => c.clients)
export const currentClients = (): Client[] => companyStore.get().clients

export function saveClient(actor: Actor, next: Client, was?: string): string | null {
  const refused = refusal(actor, CLIENT_EDITOR, 'Changing a client')
  if (refused) return refused
  if (!was && currentClients().some((c) => c.n === next.n)) return `${next.n} is already a client.`
  companyStore.update((prev) => ({
    ...prev,
    clients: was
      ? prev.clients.map((c) => (c.n === was ? { ...c, ...next, n: c.n } : c))
      : [...prev.clients, next],
  }))
  return null
}

export function removeClient(actor: Actor, name: string): string | null {
  const refused = refusal(actor, CLIENT_EDITOR, 'Changing a client')
  if (refused) return refused
  companyStore.update((prev) => ({ ...prev, clients: prev.clients.filter((c) => c.n !== name) }))
  return null
}
