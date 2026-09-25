import { useStoreSlice } from '@/shared/lib/store'
import { refusal, type Actor } from '@/domain/auth/permissions'
import { companyStore, type NamingRow } from './companyStore'
import { WORKFLOW_EDITOR } from './company'

export type { NamingRow }

export const currentNaming = (): NamingRow[] => companyStore.get().naming

export const useNaming = (): NamingRow[] => useStoreSlice(companyStore, (c) => c.naming)

export const stageName = (key: string, naming: readonly NamingRow[] = currentNaming()): string =>
  naming.find((r) => r.stage === key)?.name ?? key

export function useStageName(): (key: string) => string {
  const naming = useNaming()
  return (key) => stageName(key, naming)
}

export const withStageName = (naming: readonly NamingRow[], key: string, name: string): NamingRow[] =>
  naming.some((r) => r.stage === key)
    ? naming.map((r) => (r.stage === key ? { ...r, name } : r))
    : [...naming, { concept: key, name, short: '—', used: 'board, reports, exports', stage: key, status: null }]

export const namedStatus = (k: string, naming: readonly NamingRow[] = currentNaming()): string | undefined =>
  naming.find((r) => r.status === k)?.name

export function setNaming(actor: Actor, concept: string, name: string): string | null {
  const refused = refusal(actor, WORKFLOW_EDITOR, 'Renaming a workflow stage')
  if (refused) return refused
  const v = name.trim()
  if (!v) return 'A stage needs a name.'
  companyStore.update((prev) => ({
    ...prev,
    naming: prev.naming.map((r) => (r.concept === concept ? { ...r, name: v } : r)),
  }))
  return null
}
