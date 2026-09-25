import { describe, expect, it } from 'vitest'
import { board, runDay } from './engine'
import { EXCLUSION, type ExclusionReason, type RunContext } from './narrow'
import { makeDay } from './day'
import { ASSIGN_STAGES, PAIRS, STAGES } from '@/data/org'
import { STAFF } from '@/data/people'
import type { Person, Rule } from '@/data/types'
import { coversPlace, coversProduct } from './levels'
import { must } from '../../../tests/must'

const { run: RUN, day: DAY } = board()

const personById = (id: string) => STAFF.find((s) => s.id === id)

describe('QC independence', () => {
  it('never gives a QC stage to whoever did the stage it reviews', () => {
    const offenders = RUN.orders.flatMap((o) => {
      const plan = o.plan ?? {}
      return Object.entries(PAIRS)
        .filter(([qcStage, reviewed]) => plan[qcStage] && plan[qcStage] === plan[reviewed])
        .map(([qcStage]) => `${o.id}: ${qcStage} reviewed by its own author`)
    })

    expect(offenders).toEqual([])
  })

  it('reports self-review as the reason when it is what blocked a placement', () => {
    RUN.exc
      .filter((e) => e.why === 'self')
      .forEach((e) => {
        expect(PAIRS[e.stage], `${e.stage} is not a QC stage but blocked on self-review`).toBeDefined()
      })
  })

  describe('against a roster where nothing else would prevent it', () => {
    const { lvl: _lvl, ...first } = must(STAFF[0], 'a seeded person')
    const soloist: Person = {
      ...first,
      id: 'solo',
      n: 'Only Person',
      dep: ['Search', 'Search QC'],
      cap: 99,
      open: 0,
      avail: 'ok',
      active: true,
    }

    const context = (rules: Rule[]): Partial<RunContext> => ({
      staff: [soloist],
      rules,
      assignStages: ['Search', 'Search QC'],
      stages: ['Search', 'Search QC'],
      pairs: { 'Search QC': 'Search' },
      covStages: [],
      coversPlace: () => true,
      coversProduct: () => true,
    })

    const selfReview: Rule = { id: 'r4', n: 'Self-review', k: 'block', on: true }
    const emptiest: Rule = { id: 'r8', n: 'Fill the emptiest first', k: 'prefer', on: true }

    it('refuses the QC stage rather than letting the author check their own work', () => {
      const run = runDay(makeDay(), context([selfReview, emptiest]))

      const collisions = run.orders.filter((o) => o.plan?.['Search QC'] === o.plan?.Search && o.plan?.Search)
      expect(collisions, 'the author was allowed to review their own search').toHaveLength(0)

      const blocked = run.exc.filter((e) => e.stage === 'Search QC')
      expect(blocked.length).toBeGreaterThan(0)
      blocked.forEach((e) => expect(e.why).toBe('self'))
      expect(run.avoided).toBeGreaterThan(0)
    })

    it('would otherwise place them on both — which is what the rule is for', () => {
      const run = runDay(makeDay(), context([emptiest]))

      const collisions = run.orders.filter((o) => o.plan?.['Search QC'] === o.plan?.Search && o.plan?.Search)
      expect(collisions.length, 'the counter-example no longer reproduces').toBeGreaterThan(0)
      expect(run.avoided).toBe(0)
    })
  })
})

describe('exclusions', () => {
  const reasons: ExclusionReason[] = ['no-dept', 'coverage', 'unavailable', 'capacity', 'self']

  it('gives every unplaced stage one of the five reasons', () => {
    RUN.exc.forEach((e) => {
      expect(reasons).toContain(e.why)
      expect(e.t.length, 'the reason must carry a sentence a person can act on').toBeGreaterThan(0)
    })
  })

  it('has a label and a remedy for each reason', () => {
    reasons.forEach((r) => {
      const entry = EXCLUSION[r]
      expect(entry, `no label for ${r}`).toBeDefined()
      const [label, tone, remedy] = entry
      expect(label.length).toBeGreaterThan(0)
      expect(['warn', 'bad']).toContain(tone)
      expect(remedy.length, `${r} has no remedy`).toBeGreaterThan(0)
    })
  })

  it('records a trace for every exception, so the decision can be replayed', () => {
    RUN.exc.forEach((e) => {
      expect(e.trace.length, `${e.o.id}/${e.stage} was refused with no trace`).toBeGreaterThan(0)
    })
  })

  it('accounts for every stage of every order exactly once', () => {
    expect(RUN.assigns.length + RUN.exc.length).toBe(RUN.orders.length * ASSIGN_STAGES.length)
    expect(RUN.total).toBe(RUN.orders.length * ASSIGN_STAGES.length)
  })
})

describe('placement respects the blocking rules', () => {
  it('only ever places someone who belongs to that department', () => {
    RUN.assigns.forEach((a) => {
      const p = personById(a.who)
      expect(p, `${a.who} is not on the roster`).toBeDefined()
      expect(p!.dep, `${p!.n} does not belong to ${a.stage}`).toContain(a.stage)
    })
  })

  it('never places someone who is unavailable or inactive', () => {
    RUN.assigns.forEach((a) => {
      const p = personById(a.who)!
      expect(p.avail, `${p.n} was given work while ${p.avail}`).toBe('ok')
      expect(p.active).not.toBe(false)
    })
  })

  it('never places a search stage on someone who does not cover the place or product', () => {
    const covered = ['Search', 'Search QC']
    RUN.assigns
      .filter((a) => covered.includes(a.stage))
      .forEach((a) => {
        expect(
          coversPlace(a.who, a.o.st, a.o.co),
          `${a.who} was given ${a.o.co}, ${a.o.st} without covering it`,
        ).toBe(true)
        expect(
          coversProduct(a.who, a.o.pr),
          `${a.who} was given ${a.o.pr} without working it`,
        ).toBe(true)
      })
  })

  it('never loads anyone past their daily target', () => {
    makeDay().forEach((_, dayIndex) => {
      const days = makeDay()
      const single = runDay([must(days[dayIndex], `day ${dayIndex}`)])
      Object.entries(single.load).forEach(([id, load]) => {
        const p = personById(id)!
        expect(load, `${p.n} was loaded to ${load} against a target of ${p.cap}`).toBeLessThanOrEqual(
          p.cap,
        )
      })
    })
  })
})

describe('the run is deterministic', () => {
  it('produces the same placements from the same arrivals', () => {
    const a = runDay(makeDay())
    const b = runDay(makeDay())
    expect(a.assigns.map((x) => `${x.o.id}|${x.stage}|${x.who}`)).toEqual(
      b.assigns.map((x) => `${x.o.id}|${x.stage}|${x.who}`),
    )
    expect(a.exc.length).toBe(b.exc.length)
  })

  it('deals the same five days the module-level run used', () => {
    expect(DAY).toHaveLength(5)
    expect(RUN.days).toHaveLength(5)
  })
})

describe('rule accounting', () => {
  it('counts every rule it consulted', () => {
    Object.entries(RUN.narrowed).forEach(([id, narrowed]) => {
      expect(RUN.fired[id], `rule ${id} narrowed without ever firing`).toBeGreaterThanOrEqual(
        id === 'r1' ? 0 : narrowed,
      )
    })
  })

  it('knows which departments are entirely out', () => {
    RUN.deptOut.forEach((d) => {
      expect(STAGES).toContain(d)
      const members = STAFF.filter((s) => s.dep.includes(d))
      expect(members.length).toBeGreaterThan(0)
      expect(members.every((s) => s.avail !== 'ok')).toBe(true)
    })
  })
})
