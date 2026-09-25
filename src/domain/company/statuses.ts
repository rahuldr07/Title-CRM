import { useMemo } from 'react'
import { companyStore, keyOf, type NamingRow, type StatusRow } from './companyStore'
import { useStoreSlice } from '@/shared/lib/store'
import { namedStatus, useNaming } from './naming'
import { refusal, type Actor } from '@/domain/auth/permissions'
import { WORKFLOW_EDITOR } from './company'

export type { StatusRow }

const named = (statuses: readonly StatusRow[], naming: readonly NamingRow[]): StatusRow[] =>
  statuses.map(([k, [n, c]]) => [k, [namedStatus(k, naming) ?? n, c]])

export function useStatuses(): StatusRow[] {
  const statuses = useStoreSlice(companyStore, (c) => c.statuses)
  const naming = useNaming()
  return useMemo(() => named(statuses, naming), [statuses, naming])
}
export const currentStatuses = (): StatusRow[] => named(companyStore.get().statuses, companyStore.get().naming)
const storedStatuses = (): StatusRow[] => companyStore.get().statuses
export const statusName = (k: string, statuses: readonly StatusRow[] = currentStatuses()): string =>
  statuses.find(([x]) => x === k)?.[1][0] ?? k
export const statusColour = (k: string, statuses: readonly StatusRow[] = currentStatuses()): string | undefined =>
  statuses.find(([x]) => x === k)?.[1][1]

export function moveStatus(actor: Actor, key: string, dir: -1 | 1): string | null {
  const refused = refusal(actor, WORKFLOW_EDITOR, 'Changing the order statuses')
  if (refused) return refused
  const statuses = [...storedStatuses()]
  const i = statuses.findIndex(([k]) => k === key)
  const a = statuses[i]
  const b = statuses[i + dir]
  if (!a || !b) return null
  statuses[i] = b
  statuses[i + dir] = a
  companyStore.update((prev) => ({ ...prev, statuses }))
  return null
}

export function saveStatus(actor: Actor, name: string, colour: string, k?: string): string | null {
  const refused = refusal(actor, WORKFLOW_EDITOR, 'Changing the order statuses')
  if (refused) return refused
  if (k) {
    companyStore.update((prev) => ({
      ...prev,
      naming: prev.naming.map((r) => (r.status === k ? { ...r, name } : r)),
      statuses: prev.statuses.map((s) => (s[0] === k ? [k, [name, colour]] : s)),
    }))
  } else {
    let key = keyOf(name)
    let n = 2
    while (currentStatuses().some(([x]) => x === key)) key = `${keyOf(name)}${n++}`
    companyStore.update((prev) => ({ ...prev, statuses: [...prev.statuses, [key, [name, colour]]] }))
  }
  return null
}

export function removeStatus(actor: Actor, k: string): string | null {
  const refused = refusal(actor, WORKFLOW_EDITOR, 'Changing the order statuses')
  if (refused) return refused
  companyStore.update((prev) => ({ ...prev, statuses: prev.statuses.filter(([x]) => x !== k) }))
  return null
}
