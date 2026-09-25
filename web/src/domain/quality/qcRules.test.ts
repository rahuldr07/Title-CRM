import { describe, expect, it } from 'vitest'
import { ruleOn, setQcRule } from './qcRules'
import { QC_RULES } from './quality'

const BOSS = { id: 'hw', r: 'admin' }

describe('the QC rules', () => {
  it('start as the seed has them', () => {
    for (const r of QC_RULES) expect(ruleOn(r.k), r.k).toBe(r.on)
  })

  it('turn one rule off without touching the others or the seed', () => {
    setQcRule(BOSS, 'mand', false)
    expect(ruleOn('mand')).toBe(false)
    expect(ruleOn('self')).toBe(true)
    expect(QC_RULES.find((r) => r.k === 'mand')?.on).toBe(true)
  })

  it('treat an unknown rule as off, and ignore setting one', () => {
    setQcRule(BOSS, 'nope', true)
    expect(ruleOn('nope')).toBe(false)
  })
})
