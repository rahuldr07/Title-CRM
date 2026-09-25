import { describe, expect, it } from 'vitest'
import { board } from './engine'
import { RULES, ASSIGN_STAGES } from '@/data/org'
import {
  RULE_KIND,
  canRemove,
  ruleEffect,
  ruleProblem,
  ruleThen,
  ruleWhen,
  type RuleDraft,
} from './ruleText'
import type { Rule } from '@/data/types'
import { must } from '../../../tests/must'
import { currentNaming, setNaming } from '@/domain/company/naming'

const { run: RUN } = board()

const draft = (over: Partial<RuleDraft> = {}): RuleDraft => ({
  n: 'A rule',
  k: 'route',
  on: true,
  cond: { stage: 'Search' },
  pool: ['us'],
  ...over,
})

describe('a rule read back in words', () => {
  it('states the condition the engine runs, not a stored sentence', () => {
    expect(ruleWhen({ cond: { stage: 'Typing', product: 'LIEN' } })).toBe(
      'stage is Typing and product is LIEN',
    )
    expect(ruleWhen({ cond: { state: 'AK' } })).toBe('state is AK')
    expect(ruleWhen({ cond: {} })).toBe('always')
  })

  it('prefers a hand-written phrase only where the seed supplies one', () => {
    const selfReview = RULES.find((r) => r.id === 'r4')!
    expect(ruleWhen(selfReview)).toBe(selfReview.when)
  })

  it('names the stages a coverage rule is limited to by what the company now calls them', () => {
    const check = must(currentNaming().find((r) => r.stage === 'Search QC'), 'the Search QC stage')
    expect(setNaming({ id: 'hw', r: 'admin' }, check.concept, 'Second check')).toBeNull()
    for (const id of ['r6', 'r7']) {
      expect(ruleWhen(must(RULES.find((r) => r.id === id), id))).toBe('stage is Search or Second check')
    }
  })

  it('names a routing rule with an empty pool as the trap it is', () => {
    expect(ruleThen({ k: 'route', pool: [] })).toContain('every matching order becomes an exception')
    expect(ruleThen({ k: 'route', pool: ['us'] })).toMatch(/^Only /)
  })

  it('gives every rule kind a chip and an explanation', () => {
    RULES.forEach((r) => {
      expect(RULE_KIND[r.k], `${r.id} has kind "${r.k}" with no legend entry`).toBeDefined()
    })
  })
})

describe('what a rule actually did', () => {
  it('reports the pool builder as an average, not as a count of checks', () => {
    const r1 = RULES.find((r) => r.id === 'r1')!
    const text = ruleEffect(r1, 2160, 11664)
    expect(text).toContain('built the pool')
    expect(text).toContain('5.4 candidates on average')
  })

  it('separates "never came up" from "changed nothing"', () => {
    const r = { id: 'rx', k: 'block' } as Rule
    expect(ruleEffect(r, 0, 0)).toBe('never came up')
    expect(ruleEffect(r, 500, 0)).toContain('changed nothing')
    expect(ruleEffect(r, 500, 12)).toContain('changed the answer 12 times of 500')
  })

  it('draws its counts from the run rather than from the rule', () => {
    RULES.forEach((r) => {
      expect(RUN.fired[r.id], `${r.id} was never consulted`).toBeGreaterThanOrEqual(0)
    })
    expect(Object.values(RUN.fired).some((n) => n > 0)).toBe(true)
  })
})

describe('refusing a rule that would break the board', () => {
  it('needs a name, because the trace is written in names', () => {
    expect(ruleProblem(draft({ n: '  ' }), RULES, null)).toMatch(/name/i)
  })

  it('refuses a second rule with an existing name', () => {
    const existing = must(RULES[0], 'a seeded rule')
    expect(ruleProblem(draft({ n: existing.n }), RULES, null)).toContain('already exists')
    expect(ruleProblem(draft({ n: existing.n }), RULES, existing.id)).toBeNull()
  })

  it('refuses a routing rule that routes to nobody', () => {
    expect(ruleProblem(draft({ pool: [] }), RULES, null)).toContain('every order this matches')
    expect(ruleProblem(draft({ k: 'block', pool: [] }), RULES, null)).toBeNull()
  })

  it('refuses a rule with no condition, which would catch every order', () => {
    expect(ruleProblem(draft({ cond: {} }), RULES, null)).toContain('every order at every stage')
  })

  it('accepts a rule that names both a condition and somebody to route to', () => {
    expect(ruleProblem(draft(), RULES, null)).toBeNull()
  })
})

describe('which rules may be removed', () => {
  it('keeps the two the system must never do without', () => {
    expect(canRemove(RULES.find((r) => r.id === 'r1')!)).toBe(false)
    expect(canRemove(RULES.find((r) => r.id === 'r4')!)).toBe(false)
  })

  it('keeps the built-in blocks and coverage rules, which can be turned off instead', () => {
    ;['r2', 'r3', 'r5', 'r6', 'r7'].forEach((id) => {
      const r = RULES.find((x) => x.id === id)
      if (r) expect(canRemove(r), `${id} should not be removable`).toBe(false)
    })
  })

  it('allows one that was added by hand', () => {
    expect(canRemove({ id: 'ru9mine', n: 'Mine', k: 'route', on: true })).toBe(true)
  })
})

describe('the decision trace', () => {
  it('gives each stage only its own reasoning', () => {
    const wrong = RUN.assigns
      .filter((a) => a.today)
      .map((a) => ({ a, r1s: a.trace.filter((t) => t.r === 'r1').length }))
      .filter((x) => x.r1s !== 1)
      .map((x) => `${x.a.o.id}/${x.a.stage} carries ${x.r1s} pool steps`)

    expect(wrong.slice(0, 5)).toEqual([])
  })

  it('starts every stage by building that stage’s own pool', () => {
    RUN.assigns
      .filter((a) => a.today)
      .slice(0, 50)
      .forEach((a) => {
        const [first] = a.trace
        expect(first?.note, `${a.o.id}/${a.stage}`).toBe(`${first?.left} in ${a.stage}`)
      })
  })

  it('refuses no stage without saying which rule stopped it', () => {
    RUN.exc
      .filter((e) => e.today)
      .forEach((e) => {
        expect(e.trace.length, `${e.o.id}/${e.stage} was refused with no trace`).toBeGreaterThan(0)
        expect(
          e.trace.filter((t) => t.r === 'r1').length,
          `${e.o.id}/${e.stage} carries another stage's reasoning`,
        ).toBe(1)
      })
  })

  it('never traces a stage that is not assigned automatically', () => {
    RUN.assigns.forEach((a) => expect(ASSIGN_STAGES).toContain(a.stage))
  })
})
