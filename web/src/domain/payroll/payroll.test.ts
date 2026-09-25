import { afterEach, describe, expect, it } from 'vitest'
import { monthOf, otMinsFor, paidStaff, payslipOf, ytd, companyCost, deductionParts, payTotals } from './payroll'
import { settlement } from './settlement'
import { structureOf, taxUnder } from './structure'
import { fyOf } from './fiscalYear'
import { mins } from '@/domain/attendance/workingDay'
import { resetClock, setClock } from '@/shared/lib/clock'
import { PAYCFG, PAYMONTHS } from '@/data/hrms'
import { must } from '../../../tests/must'

const staff = paidStaff()
const month = must(PAYMONTHS.at(-1), 'a pay month')

describe('the structure', () => {
  it('has someone to test', () => {
    expect(staff.length).toBeGreaterThan(0)
  })

  it('reconstitutes the CTC from its parts, for everyone', () => {
    staff.forEach((p) => {
      const s = structureOf(p)
      const rebuilt = (s.gross + s.epfEr + s.grat) * 12
      expect(Math.abs(rebuilt - s.ctc), `${p.n}: structure does not add back to CTC`).toBeLessThan(60)
    })
  })

  it('follows the 50% wage rule', () => {
    staff.forEach((p) => {
      const s = structureOf(p)
      expect(s.basic, `${p.n}: basic is not ${PAYCFG.basicPct}% of monthly`).toBe(
        Math.round((s.ctc / 12) * (PAYCFG.basicPct / 100)),
      )
      expect(s.gross).toBe(s.basic + s.hra + s.special)
    })
  })

  it('never produces a negative component', () => {
    staff.forEach((p) => {
      const s = structureOf(p)
      Object.entries(s).forEach(([k, v]) => {
        expect(v, `${p.n}: ${k} is negative`).toBeGreaterThanOrEqual(0)
      })
    })
  })
})

describe('a payslip', () => {
  it('nets out to gross minus deductions plus reimbursements, for everyone', () => {
    staff.forEach((p) => {
      const s = payslipOf(p, month)
      expect(s.net, `${p.n}: net does not reconcile`).toBe(s.gross - s.totalDed + s.claims)
    })
  })

  it('totals its own deduction lines', () => {
    staff.forEach((p) => {
      const s = payslipOf(p, month)
      const listed = s.ded.reduce((a, [, v]) => a + v, 0)
      expect(listed, `${p.n}: the deduction lines do not sum to the total shown`).toBe(s.totalDed)
    })
  })

  it('totals its own earning lines', () => {
    staff.forEach((p) => {
      const s = payslipOf(p, month)
      const listed = s.earn.reduce((a, [, v]) => a + v, 0)
      expect(listed, `${p.n}: the earning lines do not sum to the gross shown`).toBe(s.gross)
    })
  })

  it('turns an unpaid day into a deduction without anyone retyping it', () => {
    staff.forEach((p) => {
      const s = payslipOf(p, month)
      const full = structureOf(p).gross
      if (s.unpaid > 0) {
        expect(s.lopAmt, `${p.n} has ${s.unpaid} unpaid days but no loss of pay`).toBeGreaterThan(0)
      } else {
        expect(s.lopAmt).toBe(0)
      }

      if (otMinsFor(p.id, month) === 0) {
        expect(
          Math.abs(s.gross - s.arr - (full - s.lopAmt)),
          `${p.n}: the loss of pay shown is not the loss of pay taken`,
        ).toBeLessThanOrEqual(2)
      }
    })
  })

  it('states a July gross that adds up by hand, arrears and all', () => {
    const kavitha = staff.find((p) => p.id === 'kv')!
    const s = payslipOf(kavitha, 'Jul 2026')

    expect(structureOf(kavitha).gross).toBe(24_197)
    expect(s.unpaid).toBe(1)
    expect(s.lopAmt).toBe(896)
    expect(s.arr).toBe(4_200)
    expect(s.gross).toBe(27_501)
    expect(s.gross, 'arrears are being pro-rated by attendance').toBeGreaterThan(
      structureOf(kavitha).gross,
    )
  })

  it('never pays a negative net', () => {
    staff.forEach((p) => {
      PAYMONTHS.forEach((m) => {
        expect(payslipOf(p, m).net, `${p.n} nets negative in ${m}`).toBeGreaterThanOrEqual(0)
      })
    })
  })
})

describe('year to date', () => {
  it('is the sum of the months up to and including the one shown', () => {
    staff.slice(0, 5).forEach((p) => {
      const upto = PAYMONTHS.slice(0, PAYMONTHS.indexOf(month) + 1).filter((m) => m !== 'Mar 2026')
      const byHand = upto.reduce((a, m) => a + payslipOf(p, m).net, 0)
      expect(ytd(p, month).net, `${p.n}: YTD net disagrees with the months it covers`).toBe(byHand)
    })
  })
})

describe('income tax', () => {
  it('rebates the low end to nothing under both regimes', () => {
    expect(taxUnder('new', 500_000)).toBe(0)
    expect(taxUnder('old', 400_000)).toBe(0)
  })

  it('never falls as income rises', () => {
    let previous = -1
    for (let gross = 200_000; gross <= 5_000_000; gross += 100_000) {
      const tax = taxUnder('new', gross)
      expect(tax, `tax fell between ${gross - 100_000} and ${gross}`).toBeGreaterThanOrEqual(previous)
      previous = tax
    }
  })

  it('never taxes more than the income', () => {
    for (let gross = 100_000; gross <= 10_000_000; gross += 250_000) {
      expect(taxUnder('new', gross)).toBeLessThan(gross)
      expect(taxUnder('old', gross)).toBeLessThan(gross)
    }
  })
})

describe('a full and final settlement', () => {
  afterEach(resetClock)

  it('pays salary to the last day and encashes the balance', () => {
    setClock(() => new Date(2026, 6, 15))

    const kavitha = staff.find((p) => p.id === 'kv')!
    const s = settlement(kavitha, new Date(2026, 6, 15))

    expect(s.lines.map(([, amount]) => amount)).toEqual([12_547, 5_588, 0])
    expect(s.total).toBe(18_135)
    expect(s.bal.pl?.left).toBe(11)
  })

  it('withholds gratuity under five years, and says why on the line itself', () => {
    setClock(() => new Date(2026, 6, 15))

    const kavitha = staff.find((p) => p.id === 'kv')!
    const s = settlement(kavitha, new Date(2026, 6, 15))

    expect(s.yrs).toBeCloseTo(1.22, 2)
    expect(s.lines[2]?.[0]).toContain('under the five-year threshold')
  })

  it('pays it once the five years are served, which is what makes that a threshold', () => {
    setClock(() => new Date(2031, 6, 15))

    const kavitha = staff.find((p) => p.id === 'kv')!
    const s = settlement(kavitha, new Date(2031, 6, 15))

    expect(s.yrs, 'the counter-example no longer crosses the threshold').toBeGreaterThanOrEqual(5)
    expect(s.lines[2]?.[1]).toBe(45_720)
    expect(s.lines[2]?.[0]).toContain('6 completed years')
  })
})

describe('the month a dated record belongs to', () => {
  it('labels a date it can read', () => {
    expect(monthOf('07/15/2026')).toBe('Jul 2026')
    expect(monthOf('01/01/2026')).toBe('Jan 2026')
    expect(monthOf('12/31/2026')).toBe('Dec 2026')
  })

  it('gives no label to a date it cannot read', () => {
    for (const d of ['2026-07-15', '15 July 2026', '', 'never']) {
      expect(monthOf(d), `${d} should belong to no month`).toBe('')
    }
  })

  it('gives no label to a month number that is not a month', () => {
    expect(monthOf('13/01/2026')).toBe('')
    expect(monthOf('00/01/2026')).toBe('')
  })

  it('never returns a label that matches a real month it did not mean', () => {
    for (const mn of PAYMONTHS) {
      expect(monthOf('2026-07-15')).not.toBe(mn)
    }
  })
})

describe('a punch time with a part missing', () => {
  it('reads the parts it has', () => {
    expect(mins('09:30')).toBe(570)
    expect(mins('00:00')).toBe(0)
    expect(mins('23:59')).toBe(1439)
  })

  it('is a number rather than NaN when a part is missing', () => {
    for (const t of ['09', '', 'half nine']) {
      expect(Number.isFinite(mins(t)), `${t} produced ${mins(t)}`).toBe(true)
    }
    expect(mins('09')).toBe(540)
    expect(mins('')).toBe(0)
  })
})

describe('year to date', () => {
  const p = must(staff[0], 'someone on the payroll')
  const netOf = (months: string[]) => months.reduce((a, m) => a + payslipOf(p, m).net, 0)

  it('starts in April', () => {
    expect(ytd(p, 'Jul 2026').net).toBe(netOf(['Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026']))
  })

  it('closes the year in March', () => {
    expect(ytd(p, 'Mar 2026').net).toBe(netOf(['Mar 2026']))
  })

  it('says how many months it covers', () => {
    expect(ytd(p, 'May 2026').months).toBe(2)
    expect(ytd(p, 'Mar 2026').months).toBe(1)
  })

  it('names the financial year a date falls in', () => {
    expect(fyOf(new Date(2026, 7, 3))).toBe('FY 2026-27')
    expect(fyOf(new Date(2026, 2, 31))).toBe('FY 2025-26')
    expect(fyOf(new Date(2026, 3, 1))).toBe('FY 2026-27')
  })
})

describe('the month’s totals', () => {
  const t = () => payTotals(month)

  it('lists deductions whose parts sum to the total', () => {
    const parts = deductionParts(t())
    expect(parts.reduce((a, [, v]) => a + v, 0)).toBe(t().ded)
  })

  it('charges the employer ESI exactly where the employee pays it, at 3.25% against 0.75%', () => {
    const covered = t().list.filter((x) => x.esi > 0)
    expect(covered.length).toBeGreaterThan(0)
    t().list.forEach((x) => {
      expect(x.esiEr > 0, x.p.n).toBe(x.esi > 0)
      expect(Math.abs(x.esiEr - (x.esi * 3.25) / PAYCFG.esiPct), x.p.n).toBeLessThan(5)
    })
  })

  it('counts employer ESI in what the month costs', () => {
    const x = t()
    expect(companyCost(x)).toBe(x.gross + x.erpf + x.esiEr + x.grat)
  })
})

describe('the register', () => {
  it('reads across to net pay: gross less every deduction, plus reimbursements', () => {
    const t = payTotals(month)
    t.list.forEach((x) => {
      const loans = x.loanDeds.reduce((a, d) => a + d.amount, 0)
      expect(x.gross - x.epf - x.pt - x.esi - x.tds - loans + x.claims, x.p.n).toBe(x.net)
    })
    expect(t.claims).toBe(t.list.reduce((a, x) => a + x.claims, 0))
  })
})
