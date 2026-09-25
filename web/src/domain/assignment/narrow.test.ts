import { describe, expect, it } from 'vitest'
import { board } from './engine'
import { defaultContext, narrowPool, type RunContext } from './narrow'
import { ORDERS } from '@/data/production'
import { STAFF } from '@/data/people'
import { ASSIGN_STAGES, COVSTAGES, RULES } from '@/data/org'
import { coversPlace, coversProduct } from './levels'
import type { Person, Rule } from '@/data/types'
import { newPerson } from '@/domain/people/people'
import { must } from '../../../tests/must'

const LOAD = board().run.load

const COVERED = COVSTAGES.filter((s) => ASSIGN_STAGES.includes(s))

const person = (over: Partial<Person> & Pick<Person, 'id' | 'n' | 'dep' | 'cap'>): Person => ({
  ...newPerson(),
  e: `${over.id}@example.com`,
  ...over,
})

const ctx = (over: Partial<RunContext>): RunContext => ({ ...defaultContext(), ...over })

const unfilled = (proposals: { o: { id: string }; stage: string; picked: Person | undefined }[]) =>
  proposals.filter((p) => !p.picked).map((p) => `${p.o.id}/${p.stage}`)

describe('the coverage rules the order screen had dropped', () => {
  const lien = ORDERS.find((o) => o.pr === 'LIEN' && o.st === 'PA' && o.co === 'Cambria')

  it('has that order in the register, or this test is asking about nothing', () => {
    expect(lien, 'the seed no longer carries a LIEN order in Cambria, PA').toBeDefined()
    expect(coversProduct('ap', 'LIEN'), 'Asha P now works LIEN, so the case is gone').toBe(false)
    expect(coversPlace('ap', 'PA', 'Cambria'), 'Asha P no longer covers Cambria').toBe(true)
  })

  it('refuses the searcher who does not work that product', () => {
    const order = must(lien, 'a LIEN order in Cambria, PA')
    const picked = must(
      narrowPool(order, 'Search', { load: LOAD, target: false }).pool[0],
      'an eligible searcher, since nobody at all being eligible is not the point being made',
    )

    expect(picked.id, 'a searcher who does not work LIEN was proposed').not.toBe('ap')
    expect(coversProduct(picked.id, order.pr)).toBe(true)
    expect(coversPlace(picked.id, order.st, order.co)).toBe(true)
  })

  it('would otherwise propose her — which is what the order screen was doing', () => {
    const withoutCoverage = narrowPool(must(lien, 'a LIEN order in Cambria, PA'), 'Search', {
      ctx: ctx({ covStages: [] }),
      load: LOAD,
      target: false,
    })

    expect(withoutCoverage.pool[0]?.id, 'the counter-example no longer reproduces').toBe('ap')
  })

  it('proposes nobody the coverage rules exclude, on any order in the register', () => {
    const proposals = ORDERS.flatMap((o) =>
      COVERED.map((stage) => ({ o, stage, picked: narrowPool(o, stage, { load: LOAD, target: false }).pool[0] })),
    )

    const offenders = proposals.flatMap(({ o, stage, picked }) => {
      if (!picked) return []
      const bad: string[] = []
      if (!coversPlace(picked.id, o.st, o.co)) bad.push(`${o.id}/${stage}: ${picked.n} does not cover ${o.co}, ${o.st}`)
      if (!coversProduct(picked.id, o.pr)) bad.push(`${o.id}/${stage}: ${picked.n} does not work ${o.pr}`)
      return bad
    })

    expect(unfilled(proposals), 'the coverage rules narrowed these to nobody').toEqual([])
    expect(offenders).toEqual([])
  })
})

describe('what stopped it, when nobody is left', () => {
  const only = (p: Person, over: Partial<RunContext> = {}) =>
    ctx({
      staff: [p],
      assignStages: ['Search', 'Search QC'],
      stages: ['Search', 'Search QC'],
      pairs: { 'Search QC': 'Search' },
      covStages: ['Search', 'Search QC'],
      coversPlace: () => true,
      coversProduct: () => true,
      ...over,
    })

  const order = { pr: 'COS', st: 'AK', cl: 'MGR', co: 'Nome' }
  const searcher = person({ id: 'x1', n: 'Ex One', dep: ['Search'], cap: 5 })

  it('says nobody belongs to the stage when the department is empty', () => {
    const r = narrowPool(order, 'Search', { ctx: only(searcher, { staff: [] }) })
    expect(r.pool).toEqual([])
    expect(r.stop).toEqual({ why: 'no-dept', rule: 'r1' })
  })

  it('blames the place, not the roster, when nobody covers the county', () => {
    const r = narrowPool(order, 'Search', { ctx: only(searcher, { coversPlace: () => false }) })
    expect(r.stop).toEqual({ why: 'coverage', rule: 'r6' })
  })

  it('blames the product separately, so the remedy differs', () => {
    const r = narrowPool(order, 'Search', { ctx: only(searcher, { coversProduct: () => false }) })
    expect(r.stop).toEqual({ why: 'coverage', rule: 'r7' })
  })

  it('says unavailable only when the person was otherwise a candidate', () => {
    const away = person({ id: 'x1', n: 'Ex One', dep: ['Search'], cap: 5, avail: 'leave' })
    const r = narrowPool(order, 'Search', { ctx: only(away) })
    expect(r.stop).toEqual({ why: 'unavailable', rule: 'r2' })
  })

  it('says at target when the only candidate is full', () => {
    const r = narrowPool(order, 'Search', { ctx: only(searcher), load: { x1: 5 } })
    expect(r.stop).toEqual({ why: 'capacity', rule: 'r3' })
  })

  it('says self-review when the only person left did the paired stage', () => {
    const both = person({ id: 'x1', n: 'Ex One', dep: ['Search', 'Search QC'], cap: 5 })
    const r = narrowPool(order, 'Search QC', { ctx: only(both), taken: { Search: 'x1' } })
    expect(r.stop).toEqual({ why: 'self', rule: 'r4' })
    expect(r.paired).toBe('Search')
  })

  it('lets the same person through when they did not do the paired stage', () => {
    const both = person({ id: 'x1', n: 'Ex One', dep: ['Search', 'Search QC'], cap: 5 })
    const r = narrowPool(order, 'Search QC', { ctx: only(both), taken: { Search: 'someone-else' } })
    expect(r.stop).toBeUndefined()
    expect(r.pool.map((p) => p.id)).toEqual(['x1'])
  })
})

describe('the routing rules', () => {
  const r5 = RULES.find((r) => r.id === 'r5') as Rule
  const lienTyping = { pr: 'LIEN', st: 'PA', cl: 'MGR', co: 'Cambria' }

  it('is a routing rule that is on and names a pool', () => {
    expect(r5.k).toBe('route')
    expect(r5.on).toBe(true)
    expect(r5.pool?.length).toBeGreaterThan(0)
  })

  it('narrows LIEN typing to the group the rule names', () => {
    const r = narrowPool(lienTyping, 'Typing', { load: LOAD, target: false })
    expect(r.pool.length).toBeGreaterThan(0)
    r.pool.forEach((p) => expect(r5.pool, `${p.n} is not in the LIEN typing group`).toContain(p.id))
  })

  it('leaves a different product to the whole department, so the rule is doing it', () => {
    const cos = narrowPool({ ...lienTyping, pr: 'COS' }, 'Typing', { load: LOAD, target: false })
    expect(cos.pool.some((p) => !r5.pool?.includes(p.id)), 'nobody outside the group types at all').toBe(true)
  })
})

describe('the daily target, which the order screen deliberately does not enforce', () => {
  const full = person({ id: 'x1', n: 'Ex One', dep: ['Search'], cap: 5 })
  const world = ctx({
    staff: [full],
    assignStages: ['Search'],
    stages: ['Search'],
    pairs: {},
    covStages: [],
  })

  it('refuses somebody already at their target when the pass is automatic', () => {
    const r = narrowPool({ pr: 'COS', st: 'PA', cl: 'MGR', co: 'Cambria' }, 'Search', {
      ctx: world,
      load: { x1: 5 },
    })
    expect(r.stop?.why).toBe('capacity')
  })

  it('proposes them anyway when a person is assigning by hand', () => {
    const r = narrowPool({ pr: 'COS', st: 'PA', cl: 'MGR', co: 'Cambria' }, 'Search', {
      ctx: world,
      load: { x1: 5 },
      target: false,
    })
    expect(r.stop).toBeUndefined()
    expect(r.pool.map((p) => p.id)).toEqual(['x1'])
  })

  it('is the only rule the option touches', () => {
    const noCover = ctx({ ...world, covStages: ['Search'], coversPlace: () => false })
    const r = narrowPool({ pr: 'COS', st: 'PA', cl: 'MGR', co: 'Cambria' }, 'Search', {
      ctx: noCover,
      load: { x1: 5 },
      target: false,
    })
    expect(r.stop).toEqual({ why: 'coverage', rule: 'r6' })
  })
})

describe('the order it hands them back in', () => {
  it('puts the emptiest desk first, measured against each person’s own target', () => {
    const roster = [
      person({ id: 'a1', n: 'Ada One', dep: ['Search'], cap: 10 }),
      person({ id: 'b2', n: 'Bo Two', dep: ['Search'], cap: 30 }),
    ]
    const world = ctx({
      staff: roster,
      assignStages: ['Search'],
      stages: ['Search'],
      pairs: {},
      covStages: [],
    })

    const r = narrowPool({ pr: 'COS', st: 'PA', cl: 'MGR', co: 'Cambria' }, 'Search', {
      ctx: world,
      load: { a1: 9, b2: 15 },
    })
    expect(r.pool.map((p) => p.id)).toEqual(['b2', 'a1'])
  })
})

describe('every screen gets the same answer', () => {
  it('proposes nobody the automatic pass would refuse, for any order in the register', () => {
    const routeRules = RULES.filter((x) => x.k === 'route' && x.on && x.cond)

    const proposals = ORDERS.flatMap((o) =>
      ASSIGN_STAGES.map((stage) => ({ o, stage, picked: narrowPool(o, stage, { load: LOAD, target: false }).pool[0] })),
    )

    const offenders = proposals.flatMap(({ o, stage, picked }) => {
      if (!picked) return []
      const say = (why: string) => `${o.id}/${stage}: ${picked.n} ${why}`
      const bad: string[] = []
      if (!picked.dep.includes(stage)) bad.push(say(`is not in ${stage}`))
      if (picked.avail !== 'ok') bad.push(say(`is ${picked.avail}`))
      if (picked.active === false) bad.push(say('has left'))
      routeRules.forEach((r) => {
        const c = r.cond ?? {}
        const matches = (!c.stage || c.stage === stage) && (!c.product || c.product === o.pr) && (!c.state || c.state === o.st)
        if (matches && !r.pool?.includes(picked.id)) bad.push(say(`is outside the pool ${r.n} routes to`))
      })
      if (COVERED.includes(stage)) {
        if (!coversPlace(picked.id, o.st, o.co)) bad.push(say(`does not cover ${o.co}, ${o.st}`))
        if (!coversProduct(picked.id, o.pr)) bad.push(say(`does not work ${o.pr}`))
      }
      return bad
    })

    expect(unfilled(proposals), 'the automatic pass proposed nobody for these').toEqual([])
    expect(offenders).toEqual([])
  })

  it('is asking about a roster where those rules can bite', () => {
    expect(STAFF.some((s) => s.dep.includes('Search') && !coversProduct(s.id, 'LIEN'))).toBe(true)
    expect(STAFF.some((s) => s.avail !== 'ok')).toBe(true)
    expect(RULES.some((r) => r.k === 'route' && r.on)).toBe(true)
  })
})

describe('approved leave', () => {
  const aug3 = new Date(2026, 7, 3, 12)
  const aug4 = new Date(2026, 7, 4, 12)
  const onLeave = (id: string, d: Date) => id === 'away' && d.getDate() === 3
  const staff = [
    person({ id: 'away', n: 'Away A', dep: ['Search'], cap: 50 }),
    person({ id: 'here', n: 'Here H', dep: ['Search'], cap: 1 }),
  ]
  const world = ctx({ staff, onLeave, covStages: [] })
  const order = { pr: 'LIEN', st: 'PA', cl: 'MGR', co: 'Cambria' }

  it('takes a person off the day they are away', () => {
    const r = narrowPool(order, 'Search', { ctx: world, target: false, on: aug3 })
    expect(r.pool.map((p) => p.id)).toEqual(['here'])
  })

  it('puts them back the day after', () => {
    const r = narrowPool(order, 'Search', { ctx: world, target: false, on: aug4 })
    expect(r.pool.map((p) => p.id)).toContain('away')
  })

  it('reads approved leave by default', () => {
    expect(typeof defaultContext().onLeave).toBe('function')
  })
})
