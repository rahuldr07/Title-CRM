import { ASSIGN_STAGES } from '@/data/org'
import { ruleMatches, type Candidate } from '@/domain/assignment/narrow'
import type { RuleDraft } from '@/domain/assignment/ruleText'
import type { Rule, RuleCondition } from '@/data/types'

export const blankRule = (): RuleDraft => ({ n: '', k: 'route', on: true, cond: {}, pool: [] })

export const draftOf = (r: Rule): RuleDraft => ({
  n: r.n,
  k: r.k,
  on: r.on,
  cond: { ...(r.cond ?? {}) },
  pool: [...(r.pool ?? [])],
})

export const withCond = (d: RuleDraft, k: keyof RuleCondition, v: string): RuleDraft => {
  const cond = { ...d.cond }
  if (v) cond[k] = v
  else delete cond[k]
  return { ...d, cond }
}

export const draftHits = (orders: Candidate[], cond: RuleCondition): number =>
  orders.filter((o) => ASSIGN_STAGES.some((st) => ruleMatches({ cond } as Rule, o, st))).length
