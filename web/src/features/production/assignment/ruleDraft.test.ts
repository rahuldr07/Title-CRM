import { describe, expect, it } from 'vitest'
import { blankRule, draftHits, draftOf, withCond } from './ruleDraft'
import { ASSIGN_STAGES } from '@/data/org'
import type { Rule } from '@/data/types'
import { must } from '../../../../tests/must'

const rule: Rule = { id: 'r1', n: 'Alaska', k: 'route', on: false, cond: { state: 'AK' }, pool: ['us'] }

describe('a rule draft', () => {
  it('starts as an unnamed routing rule that matches everything and routes to nobody', () => {
    expect(blankRule()).toEqual({ n: '', k: 'route', on: true, cond: {}, pool: [] })
  })

  it('copies a rule without sharing its condition or pool', () => {
    const d = draftOf(rule)
    expect(d).toEqual({ n: 'Alaska', k: 'route', on: false, cond: { state: 'AK' }, pool: ['us'] })
    d.cond.stage = 'Search'
    d.pool.push('rm')
    expect(rule.cond).toEqual({ state: 'AK' })
    expect(rule.pool).toEqual(['us'])
  })

  it('reads a rule with no condition or pool as empty', () => {
    expect(draftOf({ id: 'r2', n: 'Bare', k: 'prefer', on: true })).toEqual({ n: 'Bare', k: 'prefer', on: true, cond: {}, pool: [] })
  })

  it('sets a condition, and clears it when the value is empty', () => {
    const d = withCond(blankRule(), 'stage', 'Search')
    expect(d.cond).toEqual({ stage: 'Search' })
    expect(withCond(d, 'stage', '').cond).toEqual({})
  })
})

describe('how many orders a draft matches', () => {
  const orders = [
    { pr: 'COS', st: 'PA', cl: 'MGR' },
    { pr: 'COS', st: 'AK', cl: 'MGR' },
    { pr: 'TOS', st: 'AK', cl: 'NTC' },
  ]

  it('is every order with no condition', () => {
    expect(draftHits(orders, {})).toBe(3)
  })

  it('narrows by product and state together', () => {
    expect(draftHits(orders, { product: 'COS' })).toBe(2)
    expect(draftHits(orders, { product: 'COS', state: 'AK' })).toBe(1)
  })

  it('matches on any assignment stage, and none for a stage the engine never runs', () => {
    expect(draftHits(orders, { stage: must(ASSIGN_STAGES[0], 'an assignment stage') })).toBe(3)
    expect(draftHits(orders, { stage: 'Nowhere' })).toBe(0)
  })
})
