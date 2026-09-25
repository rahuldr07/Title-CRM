import { describe, expect, it } from 'vitest'
import { payslipOf } from './payroll'
import { settlement } from './settlement'
import { runOf, setRunState } from './payruns'
import { decideLoan, recoverForRun, requestLoan } from '@/domain/loans/loanStore'
import { currentStaff } from '@/domain/people/roster'
import { setClock } from '@/shared/lib/clock'
import type { Person } from '@/data/types'

const DRAFT = 'Jul 2026'
const PAID = 'May 2026'

const person = (id: string): Person => {
  const p = currentStaff().find((s) => s.id === id)
  if (!p) throw new Error(`${id} is not on the roster`)
  return p
}

const loanTotal = (id: string, mn: string) => payslipOf(person(id), mn).loanDeds.reduce((a, d) => a + d.amount, 0)

describe('payroll reads the loan book, not the seed', () => {
  it('is on a draft month for the test to mean anything', () => {
    expect(runOf(DRAFT)?.state).toBe('draft')
    expect(runOf(DRAFT)?.kept).toBeUndefined()
    expect(runOf(PAID)?.kept).toBeDefined()
  })

  it("deducts a loan approved in the book from the draft month's payslip", () => {
    setClock(() => new Date(2026, 5, 10, 11))
    expect(loanTotal('sr', DRAFT)).toBe(0)

    expect(decideLoan({ id: 'hw', r: 'admin' }, 'L8', 'approve').ok).toBe(true)

    const slip = payslipOf(person('sr'), DRAFT)
    expect(slip.loanDeds.map((d) => [d.loan.id, d.amount])).toEqual([['L8', 5000]])
    expect(slip.ded).toContainEqual(['Loan EMI', 5000])
  })

  it('deducts a loan requested and approved in the book, not only a seeded one', () => {
    setClock(() => new Date(2026, 5, 10, 11))
    const before = payslipOf(person('ap'), DRAFT).net
    const asked = requestLoan({ id: 'ap', r: 'staff' }, { who: 'ap', kind: 'loan', amt: 9000, emi: 3000, note: 'Test' })
    if (!asked.ok) throw new Error(asked.why)
    decideLoan({ id: 'hw', r: 'admin' }, asked.loan.id, 'approve')

    expect(payslipOf(person('ap'), DRAFT).net).toBe(before - 3000)
  })

  it('does not recover a loan in the month it was taken, as its schedule says', () => {
    setClock(() => new Date(2026, 6, 10, 11))
    decideLoan({ id: 'hw', r: 'admin' }, 'L8', 'approve')

    expect(loanTotal('sr', DRAFT)).toBe(0)
  })

  it('leaves a paid month exactly as it was when a loan is approved or paused afterwards', () => {
    setClock(() => new Date(2026, 3, 2, 11))
    const sr = payslipOf(person('sr'), PAID).net
    const rm = payslipOf(person('rm'), PAID).net

    decideLoan({ id: 'hw', r: 'admin' }, 'L8', 'approve')
    decideLoan({ id: 'hw', r: 'admin' }, 'L1', 'pause')

    expect(payslipOf(person('sr'), PAID).net).toBe(sr)
    expect(payslipOf(person('rm'), PAID).net).toBe(rm)
  })

  it('keeps what a month was approved with, even when a loan is approved after it closed', () => {
    setClock(() => new Date(2026, 5, 10, 11))
    const ids = currentStaff().map((s) => s.id)
    recoverForRun({ id: 'hw', r: 'admin' }, DRAFT, ids)
    setRunState({ id: 'hw', r: 'admin', n: 'Harry Whitfield' }, DRAFT, 'approved')
    const closed = payslipOf(person('sr'), DRAFT).net

    decideLoan({ id: 'hw', r: 'admin' }, 'L8', 'approve')

    expect(payslipOf(person('sr'), DRAFT).net).toBe(closed)
  })

  it('records the instalment of a newly approved loan when the draft month is approved', () => {
    setClock(() => new Date(2026, 5, 10, 11))
    decideLoan({ id: 'hw', r: 'admin' }, 'L8', 'approve')
    recoverForRun({ id: 'hw', r: 'admin' }, DRAFT, currentStaff().map((s) => s.id))
    setRunState({ id: 'hw', r: 'admin', n: 'Harry Whitfield' }, DRAFT, 'approved')

    expect(loanTotal('sr', DRAFT)).toBe(5000)
  })

  it('recovers an approved loan in the final settlement', () => {
    const before = settlement(person('sr')).lines.find(([k]) => k.startsWith('Advance outstanding'))
    expect(before).toBeUndefined()

    decideLoan({ id: 'hw', r: 'admin' }, 'L8', 'approve')

    expect(settlement(person('sr')).lines).toContainEqual(['Advance outstanding, recovered', -50000])
  })
})
