import { afterEach, describe, expect, it } from 'vitest'
import { ATT, OT } from '@/data/hrms'
import { LOANS } from '@/data/loans'
import { STAFF } from '@/data/people'
import { resetClock, setClock } from '@/shared/lib/clock'
import { otMinsFor, otPay, paidStaff, payTotals, payslipOf } from './payroll'
import { settlement } from './settlement'
import { words } from './amountInWords'
import type { AttendanceRow, Person } from '@/data/types'

afterEach(resetClock)

const person = (id: string): Person => {
  const p = STAFF.find((s) => s.id === id)
  if (!p) throw new Error(`no one with id ${id} on the roster`)
  return p
}

const UMA = person('us')
const DEV = person('dn')
const KAV = person('kv')
const NEIL = person('nb')
const BHAVANI = person('bn')

const JUL = 'Jul 2026'

const UMA_GROSS = 25952
const NEIL_GROSS = 20914

const DAY_MS = 24 * 3600 * 1000
const YEAR_MS = 365.25 * DAY_MS
const fiveYearsAfter = (doj: Date) => new Date(doj.getTime() + 5 * YEAR_MS)

const UMA_JOINED = new Date(2024, 10, 12)
const NEIL_JOINED = new Date(2020, 8, 25)
const LAST_DAY = new Date(2026, 6, 31)

describe('the roster these figures are worked out from', () => {
  it('is unchanged', () => {
    expect(UMA.ctc).toBe(340000)
    expect(UMA.doj).toBe('11/12/2024')
    expect(DEV.ctc).toBe(323000)
    expect(NEIL.ctc).toBe(274000)
    expect(NEIL.doj).toBe('09/25/2020')
    expect(BHAVANI.ctc).toBe(288000)
    expect(ATT[JUL]?.us?.working).toBe(27)
    expect(paidStaff()).toHaveLength(28)
  })
})

describe('overtime', () => {
  it('pays the ordinary hourly rate for the month it was worked in', () => {
    expect(otPay(UMA, JUL)).toBe(190)
  })

  it('is a different rate for every gross', () => {
    expect(otPay(DEV, JUL)).toBe(133)
  })

  it('rounds the rupee rather than carrying paise onto the payslip', () => {
    expect(Number.isInteger(otPay(UMA, JUL))).toBe(true)
    expect(Number.isInteger(otPay(DEV, JUL))).toBe(true)
    expect(otPay(UMA, JUL) + otPay(DEV, JUL)).toBe(323)
  })

  it('pays nothing for overtime nobody has approved', () => {
    const pending = OT.find((o) => o.who === 'kv' && o.st === 'pending')
    expect(pending?.mins).toBe(120)
    expect(otMinsFor('kv', JUL)).toBe(0)
    expect(otPay(KAV, JUL)).toBe(0)
  })

  it('pays nothing in a month nobody worked overtime in', () => {
    expect(otPay(UMA, 'Jun 2026')).toBe(0)
    expect(otPay(UMA, '')).toBe(0)
  })

  it('states the approved minutes on the payslip line it adds', () => {
    expect(payslipOf(UMA, JUL).earn).toContainEqual(['Overtime — 1h 35m approved', 190])
    expect(payslipOf(DEV, JUL).earn).toContainEqual(['Overtime — 1h 10m approved', 133])
  })
})

describe('gratuity at the five-year threshold', () => {
  const FIVE_YEARS_OF_IT = 40866
  const SIX_YEARS_OF_IT = 49040

  it('pays none of it the day before the anniversary', () => {
    setClock(() => new Date(fiveYearsAfter(UMA_JOINED).getTime() - DAY_MS))
    const f = settlement(UMA, LAST_DAY)
    expect(f.lines[2]).toEqual([
      'Gratuity — 5.0 years served, under the five-year threshold',
      0,
    ])
    expect(f.total).toBe(34541)
  })

  it('pays five years of it on the anniversary itself', () => {
    setClock(() => fiveYearsAfter(UMA_JOINED))
    const f = settlement(UMA, LAST_DAY)
    expect(f.yrs).toBe(5)
    expect(f.lines[2]).toEqual(['Gratuity — 5 completed years at 15 days of basic', FIVE_YEARS_OF_IT])
    expect(f.total).toBe(75407)
  })

  it('pays the same five years the day after', () => {
    setClock(() => new Date(fiveYearsAfter(UMA_JOINED).getTime() + DAY_MS))
    const f = settlement(UMA, LAST_DAY)
    expect(f.lines[2]).toEqual(['Gratuity — 5 completed years at 15 days of basic', FIVE_YEARS_OF_IT])
  })

  it('counts completed years only, so the sixth arrives whole', () => {
    setClock(() => new Date(UMA_JOINED.getTime() + 6 * YEAR_MS - DAY_MS))
    expect(settlement(UMA, LAST_DAY).lines[2]?.[1]).toBe(FIVE_YEARS_OF_IT)

    setClock(() => new Date(UMA_JOINED.getTime() + 6 * YEAR_MS))
    expect(settlement(UMA, LAST_DAY).lines[2]).toEqual([
      'Gratuity — 6 completed years at 15 days of basic',
      SIX_YEARS_OF_IT,
    ])
  })

  it('pays none of it, and says why, with no joining date on the record', () => {
    setClock(() => fiveYearsAfter(UMA_JOINED))
    const undated: Person = { ...UMA, doj: '' }
    const f = settlement(undated, LAST_DAY)
    expect(f.yrs).toBeNull()
    expect(f.lines[2]).toEqual(['Gratuity — no joining date on record', 0])
    expect(f.total).toBe(34541)
  })

  it('reads a date it cannot parse as no date rather than as NaN years', () => {
    setClock(() => fiveYearsAfter(UMA_JOINED))
    const misshapen: Person = { ...UMA, doj: '2024-11-12' }
    const f = settlement(misshapen, LAST_DAY)
    expect(f.yrs).toBeNull()
    expect(f.lines[2]).toEqual(['Gratuity — no joining date on record', 0])
  })
})

describe('the rest of a settlement', () => {
  it('encashes the paid leave left at the basic day rate', () => {
    setClock(() => fiveYearsAfter(UMA_JOINED))
    const f = settlement(UMA, LAST_DAY)
    expect(f.bal.pl?.left).toBe(14)
    expect(f.lines[1]).toEqual(['Leave encashment — 14 days of paid leave', 7628])
  })

  it('says "day" when only one is left', () => {
    setClock(() => new Date(2026, 2, 15))
    expect(settlement(BHAVANI, LAST_DAY).lines[1]).toEqual([
      'Leave encashment — 1 day of paid leave',
      462,
    ])
  })

  it('recovers what is still outstanding on a loan, as the last line', () => {
    setClock(() => fiveYearsAfter(NEIL_JOINED))
    const f = settlement(NEIL, LAST_DAY)
    expect(f.lines).toEqual([
      ['Salary to the last working day', 21689],
      ['Leave encashment — 11 days of paid leave', 4830],
      ['Gratuity — 5 completed years at 15 days of basic', 32934],
      ['Advance outstanding, recovered', -8000],
    ])
    expect(f.total).toBe(51453)

    const loan = LOANS.find((l) => l.who === 'nb')
    expect(loan && loan.amt - loan.paid).toBe(8000)
  })

  it('leaves the advance line off when there is nothing to recover', () => {
    setClock(() => fiveYearsAfter(UMA_JOINED))
    expect(settlement(UMA, LAST_DAY).lines).toHaveLength(3)
  })

  it('pro-rates the salary to the day given rather than the day it is run', () => {
    setClock(() => fiveYearsAfter(UMA_JOINED))
    expect(settlement(UMA, new Date(2026, 6, 15)).lines[0]).toEqual([
      'Salary to the last working day',
      13457,
    ])
  })

  it('pays more than a full month to someone leaving on the 31st', () => {
    setClock(() => fiveYearsAfter(UMA_JOINED))
    const f = settlement(UMA, LAST_DAY)
    expect(ATT[JUL]?.us?.working).toBe(27)
    expect(f.lines[0]).toEqual(['Salary to the last working day', 26913])
    expect((f.lines[0]?.[1] ?? 0) - UMA_GROSS).toBe(961)
  })

  it('settles someone with no attendance row against a 26-day month', () => {
    setClock(() => fiveYearsAfter(UMA_JOINED))
    const unrostered: Person = { ...UMA, id: 'zz' }
    const f = settlement(unrostered, LAST_DAY)
    expect(f.lines[0]).toEqual(['Salary to the last working day', 26950])
    expect(f.lines[1]).toEqual(['Leave encashment — 17 days of paid leave', 9263])
    expect(f.total).toBe(77079)
  })

  it('is the sum of the lines it shows, so nothing is added off the slip', () => {
    setClock(() => fiveYearsAfter(NEIL_JOINED))
    const f = settlement(NEIL, LAST_DAY)
    expect(f.total).toBe(f.lines.reduce((a, [, v]) => a + v, 0))
    expect(f.st.gross).toBe(NEIL_GROSS)
  })
})

describe('the month as a whole', () => {
  it('names exactly the people with unpaid days, and how many', () => {
    const lop = payTotals(JUL).lop.map((s) => [s.p.id, s.unpaid])
    expect(lop).toEqual([
      ['dn', 1],
      ['rm', 1],
      ['kv', 1],
      ['sr', 2],
      ['nb', 1],
      ['vs', 3],
    ])
  })

  it('adds July up to the rupee', () => {
    const t = payTotals(JUL)
    expect(t.list).toHaveLength(28)
    expect(t.gross).toBe(876006)
    expect(t.ded).toBe(77482)
    expect(t.net).toBe(800764)
    expect(t.pf).toBe(45094)
    expect(t.erpf).toBe(45640)
    expect(t.esi).toBe(151)
    expect(t.pt).toBe(5600)
    expect(t.tds).toBe(5637)
    expect(t.grat).toBe(22801)
    expect(t.loans).toBe(21000)
  })

  it('pays a full month for a month it has no attendance for', () => {
    const t = payTotals('')
    expect(t.list).toHaveLength(28)
    expect(t.lop).toEqual([])
    expect(t.gross).toBe(879811)
    expect(t.gross).toBeGreaterThan(payTotals(JUL).gross)
    expect(t.ded).toBe(85034)
    expect(t.net).toBe(794777)
    expect(t.pf).toBe(45640)
    expect(t.esi).toBe(157)
    expect(t.pt).toBe(5600)
    expect(t.tds).toBe(5637)
    expect(t.loans).toBe(28000)
  })

  it('recovers the live, active loans in a month that does not exist', () => {
    const t = payTotals('')
    expect(t.ded - (t.pf + t.esi + t.pt + t.tds)).toBe(28000)
  })
})

describe('the amount in words', () => {
  it('groups by crore, lakh and thousand', () => {
    expect(words(1234567)).toBe('Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Only')
    expect(words(10000000)).toBe('One Crore Only')
    expect(words(100000)).toBe('One Lakh Only')
    expect(words(1000)).toBe('One Thousand Only')
  })

  it('skips the groups that are empty rather than saying zero of them', () => {
    expect(words(10000567)).toBe('One Crore Five Hundred Sixty Seven Only')
    expect(words(100000)).not.toContain('Thousand')
  })

  it('says the teens, the tens and the hundreds', () => {
    expect(words(15)).toBe('Fifteen Only')
    expect(words(20)).toBe('Twenty Only')
    expect(words(21)).toBe('Twenty One Only')
    expect(words(119)).toBe('One Hundred Nineteen Only')
    expect(words(900)).toBe('Nine Hundred Only')
  })

  it('rounds to the rupee, because paise are not said aloud', () => {
    expect(words(1234.4)).toBe('One Thousand Two Hundred Thirty Four Only')
    expect(words(1234.6)).toBe('One Thousand Two Hundred Thirty Five Only')
  })

  it('says a net below zero rather than reading the gap off the end of its tables', () => {
    expect(words(-5637)).toBe('Minus Five Thousand Six Hundred Thirty Seven Only')
    expect(words(-1)).toBe('Minus One Only')
    expect(words(-1234567)).toBe(
      'Minus Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Only',
    )
    expect(words(-1234567)).toBe(`Minus ${words(1234567)}`)
  })

  it('says a net of nothing as "Zero", without the "Only" every other net ends in', () => {
    expect(words(0)).toBe('Zero')
    expect(words(0.4)).toBe('Zero')
    expect(words(1)).toBe('One Only')
  })
})

describe('a payslip with no paid days at all', () => {
  const SPARE = 'Feb 2026'
  const row = (lop: number): AttendanceRow => ({
    days: 28,
    working: 24,
    hol: 0,
    lop,
    paidLeave: 0,
    payable: 24,
    joined: false,
    present: 24 - lop,
  })

  afterEach(() => {
    delete ATT[SPARE]
  })

  it('earns nothing, deducts nothing, and nets nothing', () => {
    ATT[SPARE] = { us: row(24) }
    const s = payslipOf(UMA, SPARE)
    expect(s.gross).toBe(0)
    expect(s.lopAmt).toBe(UMA_GROSS)
    expect(s.epf).toBe(0)
    expect(s.esi).toBe(0)
    expect(s.pt).toBe(0)
    expect(s.totalDed).toBe(0)
    expect(s.net).toBe(0)
    expect(words(s.net)).toBe('Zero')
  })

  it('reads like every other slip again the moment one day is paid', () => {
    ATT[SPARE] = { us: row(23) }
    const s = payslipOf(UMA, SPARE)
    expect(s.gross).toBe(1081)
    expect(s.epf).toBe(71)
    expect(s.esi).toBe(8)
    expect(s.pt).toBe(200)
    expect(s.net).toBe(802)
    expect(words(s.net)).toBe('Eight Hundred Two Only')
  })

  it('still deducts a full month of tax from the people who pay any', () => {
    ATT[SPARE] = { hw: row(24) }
    const s = payslipOf(person('hw'), SPARE)
    expect(s.gross).toBe(0)
    expect(s.tds).toBe(5637)
    expect(s.net).toBe(-5637)
    expect(words(s.net)).toBe('Minus Five Thousand Six Hundred Thirty Seven Only')
  })
})
