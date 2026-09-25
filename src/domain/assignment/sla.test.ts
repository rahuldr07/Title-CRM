import { describe, expect, it } from 'vitest'
import {
  budgetOK,
  checkpoints,
  curStageOf,
  defaultRule,
  orderPlan,
  shareTotal,
  sharesFor,
  slaHours,
  slaRuleFor,
  hh,
  stageWindows,
} from './sla'
import { BUDGET } from '@/data/budget'
import { ASSIGN_STAGES } from '@/data/org'
import { PRODUCTS } from '@/data/catalog'
import { ORDERS } from '@/data/production'
import { SEED_NOW } from '@/shared/lib/clock'
import { addSla, currentSla, setBuffer, setSlaHours } from '@/domain/assignment/turnaround'
import type { OrderStatus } from '@/data/types'
import { must } from '../../../tests/must'

const BOSS = { id: 'hw', r: 'admin' }

describe('stage budgets', () => {
  it('divides exactly 100% of the window, for the base and every override', () => {
    expect(budgetOK(BUDGET.base), 'the base shares do not sum to 100').toBe(true)
    BUDGET.over.forEach((o) => {
      expect(budgetOK(o.shares), `the ${o.pr} override does not sum to 100`).toBe(true)
    })
  })

  it('gives every automatic stage a share', () => {
    ASSIGN_STAGES.forEach((st) => {
      expect(BUDGET.base[st], `${st} has no share of the budget`).toBeGreaterThan(0)
    })
  })

  it('resolves a share set for every product in the catalogue', () => {
    PRODUCTS.forEach((p) => {
      expect(Math.round(shareTotal(sharesFor(p.id))), `${p.id} resolves to a broken budget`).toBe(100)
    })
  })

  it('holds the buffer back rather than dividing it', () => {
    expect(BUDGET.buffer).toBeGreaterThan(0)
    expect(BUDGET.buffer).toBeLessThan(100)

    const cps = checkpoints(24, 'COS')
    const last = must(cps.at(-1), 'a last checkpoint')
    expect(last.by).toBeCloseTo(24 * (1 - BUDGET.buffer / 100), 5)
    expect(last.by).toBeLessThan(24)
  })
})

describe('checkpoints', () => {
  it('runs in stage order and never goes backwards', () => {
    PRODUCTS.forEach((p) => {
      const cps = checkpoints(slaHours({ cl: 'MGR', pr: p.id }), p.id)
      expect(cps.map((c) => c.stage)).toEqual(ASSIGN_STAGES)
      cps.forEach((c, i) => {
        expect(c.hours, `${p.id}/${c.stage} has no time budgeted`).toBeGreaterThan(0)
        const before = cps[i - 1]
        if (before) expect(c.by).toBeGreaterThan(before.by)
      })
    })
  })

  it('scales with the promise', () => {
    const short = checkpoints(24, 'COS')
    const long = checkpoints(48, 'COS')
    short.forEach((c, i) => expect(long[i]?.by).toBeCloseTo(c.by * 2, 5))
  })
})

describe('SLA resolution', () => {
  it('falls through client+product, then client, then default', () => {
    expect(slaHours({ cl: 'CSS', pr: 'COS' })).toBe(48)
    expect(slaHours({ cl: 'MGR', pr: 'LIEN' })).toBe(24)
    expect(slaHours({ cl: 'nobody', pr: 'nothing' })).toBe(24)
  })

  it('always resolves to a positive number of hours', () => {
    ORDERS.forEach((o) => {
      expect(slaHours(o), `${o.id} resolved to a non-positive SLA`).toBeGreaterThan(0)
    })
  })
})

describe('order plans', () => {
  it('never claims an order is both finished and out of time', () => {
    ORDERS.forEach((o) => {
      const plan = orderPlan(o)
      if (o.done) expect(plan.doomed, `${o.id} is delivered but flagged doomed`).toBe(false)
    })
  })

  it('marks an order doomed exactly when the work left outruns the clock left', () => {
    ORDERS.filter((o) => !o.done).forEach((o) => {
      const plan = orderPlan(o)
      expect(plan.doomed).toBe(plan.needs > plan.remaining)
    })
  })

  it('produces one row per stage, in order', () => {
    ORDERS.forEach((o) => {
      expect(orderPlan(o).rows.map((r) => r.stage)).toEqual(ASSIGN_STAGES)
    })
  })
})

describe('the SLA and buffer an order plan was built from', () => {
  const o = must(ORDERS[0], 'a seed order')

  it('names the rule the company table resolves, not the first seed row that matches', () => {
    const plan = orderPlan(o)
    expect(plan.rule.h).toBe(plan.slaH)
    expect(plan.buffer).toBe(BUDGET.buffer)
  })

  it('moves with the SLA hours set under Company for the rule it resolves to', () => {
    const at = currentSla().indexOf(slaRuleFor(o.cl, o.pr))
    setSlaHours(BOSS, at, '72')
    const plan = orderPlan(o)
    expect(plan.rule.h).toBe(72)
    expect(plan.slaH).toBe(72)
  })

  it('takes a client and product rule added under Company over the default', () => {
    addSla(BOSS, { cl: 'ZZZ', pr: o.pr, h: 60 })
    const plan = orderPlan({ ...o, cl: 'ZZZ' })
    expect(plan.rule).toEqual({ cl: 'ZZZ', pr: o.pr, h: 60 })
    expect(plan.slaH).toBe(60)
  })

  it('moves with the buffer set under Company', () => {
    setBuffer(BOSS, '20')
    expect(orderPlan(o).buffer).toBe(20)
  })
})

describe('hour formatting', () => {
  it('switches to minutes under an hour, the way the design does', () => {
    expect(hh(2.5)).toBe('2.5h')
    expect(hh(1)).toBe('1h')
    expect(hh(0.6667)).toBe('40m')
  })
})

describe('where an order is', () => {
  const staffed = { Search: 'us', 'Search QC': 'ln', Typing: 'pd', 'Typing QC': 'sk', RTS: 'hw' }
  const order = (stt?: OrderStatus) => ({ cl: 'MGR', pr: 'LIEN', recv: SEED_NOW, a: staffed, ...(stt ? { stt } : {}) })
  const doneRows = (stt?: OrderStatus) => orderPlan(order(stt)).rows.filter((r) => r.done).map((r) => r.stage)
  const currentRow = (stt?: OrderStatus) => orderPlan(order(stt)).rows.find((r) => r.current)?.stage

  it('is at Search while its status is Search, however far it is staffed', () => {
    expect(doneRows('search')).toEqual([])
    expect(currentRow('search')).toBe('Search')
  })

  it('has the stages before its status done', () => {
    expect(doneRows('tqc')).toEqual(['Search', 'Search QC', 'Typing'])
    expect(currentRow('tqc')).toBe('Typing QC')
  })

  it('is past every stage once sent', () => {
    expect(doneRows('sent')).toEqual(['Search', 'Search QC', 'Typing', 'Typing QC', 'RTS'])
    expect(currentRow('sent')).toBeUndefined()
  })

  it('falls back to its assignments when it carries no status', () => {
    expect(currentRow()).toBe('RTS')
  })

  it('names the same stage the header does', () => {
    expect(curStageOf(order('typing'))).toBe('Typing')
  })
})

describe('stage windows', () => {
  it('are what checkpoints gives for a product', () => {
    const pr = must(PRODUCTS[0], 'a product').id
    expect(stageWindows(24, BUDGET.buffer, sharesFor(pr))).toEqual(checkpoints(24, pr))
  })

  it('fill the promise less the buffer', () => {
    const w = stageWindows(48, 10, BUDGET.base)
    expect(w.at(-1)!.by).toBeCloseTo(48 * 0.9 * (shareTotal(BUDGET.base) / 100), 6)
  })
})

describe('the turnaround fallback', () => {
  it('is the default row when there is one', () => {
    expect(defaultRule([{ cl: 'MGR', pr: 'Any', h: 12 }, { cl: '— (default)', pr: 'Any', h: 36 }])).toEqual({
      cl: '— (default)',
      pr: 'Any',
      h: 36,
    })
  })

  it('is 24 hours for any product when no default row exists', () => {
    expect(defaultRule([{ cl: 'MGR', pr: 'Any', h: 12 }])).toEqual({ cl: '—  (default)', pr: 'Any', h: 24 })
  })

  it('is the rule an order with no match of its own is promised under', () => {
    expect(slaRuleFor('NOBODY', 'NOTHING')).toEqual(defaultRule(currentSla()))
  })
})
