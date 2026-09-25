import { ENGINE, ENGINEOPTS, RULES } from '@/data/org'
import { createStore, useStore } from '@/shared/lib/store'
import { refusal, type Actor } from '@/domain/auth/permissions'
import { canRemove, ruleProblem, type RuleDraft } from './ruleText'
import type { EngineConfig, Rule } from '@/data/types'

interface RuleBook {
  rules: Rule[]
  engine: EngineConfig
}

const store = createStore<RuleBook>({ rules: RULES, engine: ENGINE })

const RULE_EDITOR = 'assign'

export const currentRules = (): Rule[] => store.get().rules
export const useRuleBook = (): RuleBook => useStore(store)

const refusedFor = (actor: Actor) => refusal(actor, RULE_EDITOR, 'Changing the assignment rules')

export const insertAt = (rules: readonly Rule[]): number => {
  const i = rules.findIndex((x) => x.k === 'prefer')
  return i < 0 ? rules.length : i
}

export function toggleRule(actor: Actor, id: string): string | null {
  const refused = refusedFor(actor)
  if (refused) return refused
  const r = currentRules().find((x) => x.id === id)
  if (!r) return 'That rule is no longer in the list.'
  if (r.lock) return `${r.n} cannot be switched off.`
  store.update((s) => ({ ...s, rules: s.rules.map((x) => (x.id === id ? { ...x, on: !x.on } : x)) }))
  return null
}

export function saveRule(actor: Actor, draft: RuleDraft, id: string | null): string | null {
  const refused = refusedFor(actor) ?? ruleProblem(draft, currentRules(), id)
  if (refused) return refused
  const existing = id ? currentRules().find((x) => x.id === id) : undefined
  const n = draft.n.trim()
  if (existing) {
    const { when: _when, then: _then, ...kept } = existing
    const next: Rule = existing.lock
      ? { ...existing, n, cond: draft.cond, pool: draft.pool }
      : { ...kept, n, k: draft.k, on: draft.on, cond: draft.cond, pool: draft.pool }
    store.update((s) => ({ ...s, rules: s.rules.map((x) => (x.id === existing.id ? next : x)) }))
    return null
  }
  const rules = [...currentRules()]
  rules.splice(insertAt(rules), 0, {
    id: `ru${rules.length}${n.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)}`,
    n,
    k: draft.k,
    on: draft.on,
    cond: draft.cond,
    pool: draft.pool,
  })
  store.update((s) => ({ ...s, rules }))
  return null
}

export function removeRule(actor: Actor, id: string): string | null {
  const refused = refusedFor(actor)
  if (refused) return refused
  const gone = currentRules().find((x) => x.id === id)
  if (!gone) return 'That rule is no longer in the list.'
  if (!canRemove(gone)) return `${gone.n} cannot be removed — the engine depends on it.`
  store.update((s) => ({ ...s, rules: s.rules.filter((x) => x.id !== id) }))
  return null
}

export function setEngine<K extends keyof EngineConfig>(actor: Actor, k: K, v: EngineConfig[K]): string {
  const refused = refusedFor(actor)
  if (refused) return refused
  store.update((s) => ({ ...s, engine: { ...s.engine, [k]: v } }))
  return ENGINEOPTS[k].find((o) => o[0] === v)?.[1] ?? String(v)
}
