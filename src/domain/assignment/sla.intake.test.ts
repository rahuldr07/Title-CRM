import { describe, expect, it } from 'vitest'
import { TIERS, dueFor, isDefaultRule, slaRuleFor, tierOf, slaHours } from './sla'
import { previewAssign } from './engine'
import type { Candidate } from './narrow'
import { ASSIGN_STAGES, PAIRS, STAGES } from '@/data/org'
import { STAFF } from '@/data/people'
import { CLIENTS, PRODUCTS } from '@/data/catalog'
import { now } from '@/shared/lib/clock'
import type { Person } from '@/data/types'
import { must } from '../../../tests/must'

const everyPair: [string, string][] = CLIENTS.flatMap((c) =>
  PRODUCTS.map((p) => [c.n, p.id] as [string, string]),
)

describe('turnaround tiers', () => {
  it('starts at standard, which changes neither the clock nor the price', () => {
    const standard = tierOf('standard')
    expect(standard.mult).toBe(1)
    expect(standard.up).toBe(0)
  })

  it('falls back to standard for a tier that does not exist', () => {
    expect(tierOf('gold-plated')).toBe(TIERS[0])
    expect(TIERS[0]?.id).toBe('standard')
  })

  it('shortens the clock and raises the fee together', () => {
    TIERS.filter((t) => t.mult < 1).forEach((t) => {
      expect(t.up, `${t.n} is faster but costs no more`).toBeGreaterThan(0)
    })
    TIERS.filter((t) => t.up > 0).forEach((t) => {
      expect(t.mult, `${t.n} costs more but buys no time`).toBeLessThan(1)
    })
  })
})

describe('the due date quoted at intake', () => {
  it('resolves a rule for every client and product in the catalogue', () => {
    everyPair.forEach(([cl, pr]) => {
      const rule = slaRuleFor(cl, pr)
      expect(rule.h, `${cl} × ${pr} resolves to no turnaround`).toBeGreaterThan(0)
    })
  })

  it('prefers the client rule over the default when there is one', () => {
    expect(slaRuleFor('MGR', 'LIEN').cl).toBe('MGR')
    expect(isDefaultRule(slaRuleFor('NTC', 'FS+'))).toBe(true)
    expect(isDefaultRule(slaRuleFor('MGR', 'LIEN'))).toBe(false)
  })

  it('never quotes a due date in the past, at any tier', () => {
    everyPair.forEach(([cl, pr]) => {
      TIERS.forEach((t) => {
        const d = dueFor(cl, pr, t.id)
        expect(d.h, `${cl} × ${pr} at ${t.n} promises ${d.h}h`).toBeGreaterThanOrEqual(1)
        expect(d.at.getTime(), `${cl} × ${pr} at ${t.n} is due in the past`).toBeGreaterThan(
          now().getTime(),
        )
      })
    })
  })

  it('applies the tier to the SLA, and reports the SLA it started from', () => {
    const base = dueFor('MGR', 'PRLP', 'standard')
    const rush = dueFor('MGR', 'PRLP', 'rush')
    expect(base.base).toBe(rush.base)
    expect(rush.h).toBe(Math.round(base.base * tierOf('rush').mult))
    expect(rush.h).toBeLessThan(base.h)
  })

  it('agrees with the register about what an order is owed', () => {
    everyPair.forEach(([cl, pr]) => {
      expect(slaRuleFor(cl, pr).h, `${cl} × ${pr}`).toBe(slaHours({ cl, pr }))
    })
  })
})

describe('the assignment preview', () => {
  const empty = (): Record<string, number> => Object.fromEntries(STAFF.map((s) => [s.id, 0]))
  const candidate: Candidate = { pr: 'COS', st: 'PA', cl: 'MGR', co: 'Cambria' }

  it('answers for every automatic stage, with a person or a reason', () => {
    const preview = previewAssign(candidate, empty())
    ASSIGN_STAGES.forEach((s) => {
      const slot = must(preview[s], `an answer for ${s}`)
      expect(
        Boolean(slot.who) !== Boolean(slot.err),
        `${s} returned both a person and a reason, or neither`,
      ).toBe(true)
    })
  })

  it('proposes nobody outside the department that runs the stage', () => {
    const preview = previewAssign(candidate, empty())
    ASSIGN_STAGES.forEach((s) => {
      const who = preview[s]?.who
      if (!who) return
      const person = STAFF.find((x) => x.id === who)
      expect(person?.dep, `${who} was proposed for ${s} without being in it`).toContain(s)
    })
  })

  it('never proposes the same person for a stage and the stage it reviews', () => {
    const preview = previewAssign(candidate, empty())
    Object.entries(PAIRS).forEach(([qcStage, reviewed]) => {
      const qc = preview[qcStage]?.who
      const author = preview[reviewed]?.who
      if (!qc || !author) return
      expect(qc, `${qcStage} was proposed to the person who would do ${reviewed}`).not.toBe(author)
    })
  })

  it('is the self-review rule doing that, not the load happening to', () => {
    const pair: Person[] = [
      {
        id: 'a1',
        n: 'Ada One',
        r: 'staff',
        e: 'a1@example.com',
        dep: ['Typing', 'Typing QC'],
        cap: 20,
        open: 0,
        avail: 'ok',
      } as Person,
      {
        id: 'b2',
        n: 'Bo Two',
        r: 'staff',
        e: 'b2@example.com',
        dep: ['Typing', 'Typing QC'],
        cap: 20,
        open: 0,
        avail: 'ok',
      } as Person,
    ]
    const ctx = {
      staff: pair,
      assignStages: ['Typing', 'Typing QC'],
      stages: ['Typing', 'Typing QC'],
      pairs: { 'Typing QC': 'Typing' },
      covStages: [] as string[],
      coversPlace: () => true,
      coversProduct: () => true,
    }

    const preview = previewAssign(candidate, { a1: 0, b2: 1 }, ctx)
    expect(preview['Typing']?.who).toBe('a1')
    expect(preview['Typing QC']?.who).toBe('b2')
  })

  it('leaves the board it was given untouched', () => {
    const load = empty()
    const before = { ...load }
    previewAssign(candidate, load)
    expect(load).toEqual(before)
  })

  it('says why when a stage has no department at all', () => {
    const preview = previewAssign(candidate, empty(), {
      staff: [],
      assignStages: ['Search'],
      stages: ['Search'],
      pairs: {},
      covStages: [],
    })
    expect(preview['Search']?.err).toBe('nobody in the department')
  })

  it('covers every stage the register carries a column for', () => {
    ASSIGN_STAGES.forEach((s) => expect(STAGES).toContain(s))
  })
})
