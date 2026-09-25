import { describe, expect, it } from 'vitest'
import { currentRules, removeRule, saveRule, setEngine, toggleRule } from './rules'
import { board } from './engine'
import { RULES } from '@/data/org'
import { must } from '../../../tests/must'
import type { RuleDraft } from './ruleText'

const LEAD = { id: 'sk', r: 'lead' }
const STAFF = { id: 'us', r: 'staff' }

const draft = (over: Partial<RuleDraft> = {}): RuleDraft => ({
  n: 'Probate to Search seniors',
  k: 'route',
  on: true,
  cond: { product: 'PRB' },
  pool: ['us'],
  ...over,
})

const toggleable = () => must(currentRules().find((r) => !r.lock), 'a rule that can be switched off')

describe('the assignment rules', () => {
  it('switch on and off in the rule book, never in the seed', () => {
    const r = toggleable()
    expect(toggleRule(LEAD, r.id)).toBeNull()
    expect(currentRules().find((x) => x.id === r.id)?.on).toBe(!r.on)
    expect(RULES.find((x) => x.id === r.id)?.on).toBe(r.on)
  })

  it('refuse every change from someone without “assign”', () => {
    const r = toggleable()
    expect(toggleRule(STAFF, r.id)).toMatch(/“assign”/)
    expect(saveRule(STAFF, draft(), null)).toMatch(/“assign”/)
    expect(removeRule(STAFF, r.id)).toMatch(/“assign”/)
    expect(setEngine(STAFF, 'commit', 'hold')).toMatch(/“assign”/)
    expect(currentRules()).toEqual(RULES)
  })

  it('check a rule where it is saved, not only in the editor', () => {
    expect(saveRule(LEAD, draft({ n: '  ' }), null)).toMatch(/name/i)
    expect(saveRule(LEAD, draft(), null)).toBeNull()
    expect(currentRules().some((r) => r.n === 'Probate to Search seniors')).toBe(true)
    expect(RULES.some((r) => r.n === 'Probate to Search seniors')).toBe(false)
  })

  it('keep the rules the engine depends on', () => {
    const locked = must(currentRules().find((r) => r.lock), 'a locked rule')
    expect(toggleRule(LEAD, locked.id)).toMatch(/cannot be switched off/)
    expect(removeRule(LEAD, locked.id)).toMatch(/cannot be removed/)
  })

  it('rerun the board when a rule changes, without anyone asking', () => {
    const before = board()
    toggleRule(LEAD, toggleable().id)
    expect(board()).not.toBe(before)
  })
})
