import { describe, expect, it } from 'vitest'
import { PAYMONTHS } from '@/data/hrms'
import { payTotals, type Payslip } from '@/domain/payroll/payroll'
import { LATEST_PAY_MONTH, runOf, type RunRecord } from '@/domain/payroll/payruns'
import { filterPayslips, latestPublished, sumPayslips } from './payslips'
import { must } from '../../../../tests/must'

const runsOf = (published: string[]): Record<string, RunRecord> =>
  Object.fromEntries(
    PAYMONTHS.map((m): [string, RunRecord] => [m, { m, state: 'draft', published: published.includes(m), by: null, at: null }]),
  )

describe('latestPublished', () => {
  it('is the last month whose payslips are out', () => {
    expect(latestPublished(runsOf([PAYMONTHS[0] ?? '', PAYMONTHS[1] ?? '']))).toBe(PAYMONTHS[1])
  })

  it('falls back to the latest pay month when nothing is published', () => {
    expect(latestPublished(runsOf([]))).toBe(LATEST_PAY_MONTH)
  })

  it('reads the seed runs', () => {
    const seeded = Object.fromEntries(PAYMONTHS.map((m) => [m, runOf(m)])) as Record<string, RunRecord>
    expect(latestPublished(seeded)).toBe(PAYMONTHS.filter((m) => runOf(m)?.published).at(-1) ?? LATEST_PAY_MONTH)
  })
})

describe('filterPayslips', () => {
  const list = payTotals(LATEST_PAY_MONTH).list

  it('keeps everyone with no filter and no query', () => {
    expect(filterPayslips(list, 'all', '  ')).toEqual(list)
  })

  it('narrows to the payslips with an unpaid day', () => {
    const lop = filterPayslips(list, 'lop', '')
    expect(lop).toEqual(list.filter((x) => x.unpaid > 0))
  })

  it('matches a name or a department, ignoring case and surrounding space', () => {
    const who = must(list[0], 'a payslip')
    expect(filterPayslips(list, 'all', `  ${who.p.n.toUpperCase()} `)).toContain(who)
    const dep = who.p.dep[0] ?? ''
    expect(filterPayslips(list, 'all', dep.toUpperCase())).toEqual(
      list.filter((x) => x.p.n.toLowerCase().includes(dep.toLowerCase()) || x.p.dep.join(' ').toLowerCase().includes(dep.toLowerCase())),
    )
    expect(filterPayslips(list, 'all', 'zzzz-nobody')).toEqual([])
  })
})

describe('sumPayslips', () => {
  it('adds gross, deductions, net, tax and unpaid days', () => {
    const slip = (gross: number, totalDed: number, tds: number, unpaid: number) =>
      ({ gross, totalDed, net: gross - totalDed, tds, unpaid }) as Payslip
    expect(sumPayslips([slip(100, 30, 5, 1), slip(200, 50, 10, 0)])).toEqual({
      gross: 300,
      ded: 80,
      net: 220,
      tds: 15,
      unpaid: 1,
    })
  })

  it('is all zeros for no payslips', () => {
    expect(sumPayslips([])).toEqual({ gross: 0, ded: 0, net: 0, tds: 0, unpaid: 0 })
  })
})
