import { QC_RULES, type QcRule } from './quality'
import { createStore, useStore } from '@/shared/lib/store'
import { refusal, type Actor } from '@/domain/auth/permissions'

const store = createStore<QcRule[]>(QC_RULES)

export const useQcRules = (): QcRule[] => useStore(store)

export const ruleOn = (key: string): boolean => store.get().find((r) => r.k === key)?.on ?? false

const QC_RULE_EDITOR = 'all'

export function setQcRule(actor: Actor, key: string, on: boolean): string | null {
  const refused = refusal(actor, QC_RULE_EDITOR, 'Changing how QC is scored')
  if (refused) return refused
  store.update((rules) => rules.map((r) => (r.k === key ? { ...r, on } : r)))
  return null
}
