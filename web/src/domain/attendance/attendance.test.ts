import { describe, expect, it } from 'vitest'
import { absencePattern, makeLateLog, makeRegularisations } from './attendance'
import { currentStaff } from '@/domain/people/roster'
import { ATT, LEAVE, PAYMONTHS, TIMECFG } from '@/data/hrms'
import { now, setClock } from '@/shared/lib/clock'
import { applyDateFormat, iso } from '@/shared/lib/format'

describe('makeRegularisations', () => {
  it('is the same list every time for the same clock', () => {
    expect(makeRegularisations()).toEqual(makeRegularisations())
  })

  it('asks about days in the last twelve, each one pending, for rostered people only', () => {
    const today = now()
    const rostered = new Set(currentStaff().filter((p) => p.dep.length && p.active !== false).map((p) => p.id))
    const list = makeRegularisations()
    expect(list.length).toBeGreaterThan(0)
    for (const r of list) {
      const days = Math.round((today.getTime() - r.d.getTime()) / 86400000)
      expect(days).toBeGreaterThanOrEqual(1)
      expect(days).toBeLessThanOrEqual(13)
      expect(r.st).toBe('pending')
      expect(rostered.has(r.who), r.who).toBe(true)
      expect(r.was.length).toBeGreaterThan(0)
      expect(r.ask.length).toBeGreaterThan(0)
    }
  })

  it('gives each correction its own id', () => {
    const ids = makeRegularisations().map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('moves with the clock rather than the wall', () => {
    setClock(() => new Date(2026, 2, 15, 17))
    const days = makeRegularisations().map((r) => r.d.getMonth())
    expect(days.every((m) => m === 2 || m === 1)).toBe(true)
  })
})

describe('makeLateLog', () => {
  const log = makeLateLog()

  it('holds only arrivals past the grace period, newest first', () => {
    expect(log.length).toBeGreaterThan(0)
    for (const l of log) expect(l.mins).toBeGreaterThan(TIMECFG.lateGraceMins)
    log.slice(1).forEach((l, i) => expect(log[i]?.d.getTime()).toBeGreaterThanOrEqual(l.d.getTime()))
  })

  it('never marks a Sunday', () => {
    for (const l of log) {
      expect(l.d.getDay()).not.toBe(0)
    }
  })

  it('stamps the arrival as the shift start plus the minutes late', () => {
    for (const l of log) {
      const [h, m] = l.due.split(':').map(Number)
      const at = ((h ?? 0) * 60 + (m ?? 0) + l.mins) % (24 * 60)
      const [ah, am] = l.at.split(':').map(Number)
      expect((ah ?? 0) * 60 + (am ?? 0)).toBe(at)
    }
  })

  it('starts every mark unwaived', () => {
    expect(log.every((l) => !l.waived)).toBe(true)
  })
})

describe('absencePattern', () => {
  it('adds the unpaid days across every pay month', () => {
    for (const p of currentStaff()) {
      const lop = PAYMONTHS.reduce((a, m) => a + (ATT[m]?.[p.id]?.lop ?? 0), 0)
      expect(absencePattern(p.id).lop, p.id).toBe(lop)
    }
  })

  it('counts approved leave only, by the weekday it began and by length', () => {
    for (const p of currentStaff()) {
      const taken = LEAVE.filter((l) => l.who === p.id && l.st === 'approved')
      const a = absencePattern(p.id)
      expect(a.total).toBe(taken.reduce((s, l) => s + l.days, 0))
      expect(a.mondays).toBe(taken.filter((l) => l.from.getDay() === 1).length)
      expect(a.fridays).toBe(taken.filter((l) => l.from.getDay() === 5).length)
      expect(a.single).toBe(taken.filter((l) => l.days <= 1).length)
    }
  })

  it('flags a pattern only at its threshold, and says why', () => {
    for (const p of currentStaff()) {
      const a = absencePattern(p.id)
      const expected = [a.lop >= 3, a.mondays >= 3, a.fridays >= 3, a.single >= 5].filter(Boolean).length
      expect(a.flags).toHaveLength(expected)
      for (const [head, why] of a.flags) {
        expect(head.length).toBeGreaterThan(0)
        expect(why.length).toBeGreaterThan(0)
      }
    }
  })

  it('has nothing to say about someone with no record', () => {
    expect(absencePattern('nobody')).toEqual({ lop: 0, mondays: 0, fridays: 0, single: 0, flags: [], total: 0 })
  })
})

describe('a public holiday', () => {
  it('marks nobody late on it, whichever order the company writes dates in', () => {
    setClock(() => new Date(2026, 7, 20, 17, 30))
    applyDateFormat('DD/MM/YYYY')
    expect(makeLateLog().filter((l) => iso(l.d) === '2026-08-15')).toEqual([])
  })
})
