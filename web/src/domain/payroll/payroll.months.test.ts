import { describe, expect, it } from 'vitest'
import { payableDays, payslipOf } from './payroll'
import { MONTHDAYS, PAYMONTHS } from '@/data/hrms'
import { STAFF } from '@/data/people'
import type { Person } from '@/data/types'
import { must } from '../../../tests/must'

const joining = (doj: string): Person => ({ ...must(STAFF[0], 'a seeded person'), id: 'test', n: 'Joiner', doj })

const INSIDE = 'Mar 2026'
const OUTSIDE = 'Aug 2026'

describe('proration inside the months the seed data carries', () => {
  it('pays a full month to someone who was already here', () => {
    expect(payableDays(joining('01/05/2025'), INSIDE, 26)).toBe(26)
  })

  it('pays nothing to someone who had not joined yet', () => {
    expect(payableDays(joining('06/01/2026'), INSIDE, 26)).toBe(0)
  })

  it('prorates from the joining day', () => {
    expect(payableDays(joining('03/16/2026'), INSIDE, 26)).toBe(13)
  })

  it('pays the whole month to someone who joined on the first of it', () => {
    expect(payableDays(joining('03/01/2026'), INSIDE, 26)).toBe(26)
  })

  it('pays a full month when there is no joining date to prorate from', () => {
    expect(payableDays(joining(''), INSIDE, 26)).toBe(26)
  })
})

describe('a month outside the five', () => {
  it('is genuinely outside them', () => {
    expect(PAYMONTHS).not.toContain(OUTSIDE)
    expect(MONTHDAYS[OUTSIDE], 'the month under test is no longer an unknown one').toBeUndefined()
  })

  it('prorates against the real length of the month', () => {
    const days = payableDays(joining('08/16/2026'), OUTSIDE, 26)
    expect(Number.isFinite(days), `${OUTSIDE} produced ${days}`).toBe(true)
    expect(days).toBe(13)
  })

  it('is exactly what the table of month lengths could not do', () => {
    const days = Number(MONTHDAYS[OUTSIDE])
    expect(Math.round((26 * (days - 16 + 1)) / days), 'the defect no longer reproduces').toBeNaN()
  })

  it('knows February is longer in a leap year', () => {
    expect(payableDays(joining('02/28/2026'), 'Feb 2026', 28)).toBe(1)
    expect(payableDays(joining('02/28/2028'), 'Feb 2028', 28)).toBe(2)
  })

  it('pays a full month when the month is not a month at all', () => {
    expect(payableDays(joining('03/16/2026'), 'not a month', 26)).toBe(26)
    expect(payableDays(joining('03/16/2026'), '', 26)).toBe(26)
  })
})

describe('a joining date that is not a joining date', () => {
  const UNREADABLE = ['2026-08-16', '16 August 2026', 'tomorrow', '08/16']

  it('pays a full month rather than NaN days', () => {
    for (const doj of UNREADABLE) {
      const days = payableDays(joining(doj), INSIDE, 26)
      expect(Number.isFinite(days), `${doj} produced ${days}`).toBe(true)
      expect(days, `${doj} should prorate to nothing`).toBe(26)
    }
  })

  it('is the same answer as carrying no joining date at all', () => {
    expect(payableDays(joining('2026-08-16'), INSIDE, 26)).toBe(payableDays(joining(''), INSIDE, 26))
  })

  it('still prorates a date it can read, so the guard is not swallowing them all', () => {
    expect(payableDays(joining('03/16/2026'), INSIDE, 26)).toBe(13)
  })
})

describe('a person the attendance register has not reached yet', () => {
  const joiner = (doj: string): Person => ({ ...joining(doj), id: 'nw' })

  it('is paid from their joining date, not for the whole month', () => {
    const whole = payslipOf(joiner('01/05/2025'), INSIDE)
    const half = payslipOf(joiner('03/16/2026'), INSIDE)
    expect(half.a.working - half.unpaid).toBe(13)
    expect(half.gross).toBeLessThan(whole.gross)
  })

  it('is paid nothing for a month before they joined', () => {
    expect(payslipOf(joiner('06/01/2026'), INSIDE).gross).toBe(0)
  })
})
