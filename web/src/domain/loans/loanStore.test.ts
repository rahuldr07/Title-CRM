import { describe, expect, it } from 'vitest'
import { currentLoanPayments, currentLoans, decideLoan, recoverForRun, requestLoan } from './loanStore'
import { LOANEVENTS, LOANPAYMENTS, LOANS } from '@/data/loans'
import { SEED_NOW, setClock } from '@/shared/lib/clock'

const loan = (id: string) => currentLoans().find((l) => l.id === id)

const US = { id: 'us', r: 'staff' }
const filed = (r: ReturnType<typeof requestLoan>) => {
  if (!r.ok) throw new Error(r.why)
  return r.loan
}

describe('requestLoan', () => {
  it('files a request with the next id, stamped now, owing nothing yet', () => {
    const l = filed(requestLoan(US, { who: 'us', kind: 'advance', amt: 8000, emi: 8000, note: 'Rent' }))
    expect(l).toMatchObject({ id: `L${LOANS.length + 1}`, who: 'us', st: 'requested', paid: 0, note: 'Rent' })
    expect(l.reqAt).toEqual(SEED_NOW)
    expect(currentLoans().at(-1)).toEqual(l)
  })

  it('is asked for by the person who will repay it, and nobody else', () => {
    const before = currentLoans().length
    const r = requestLoan({ id: 'hw', r: 'admin' }, { who: 'us', kind: 'loan', amt: 9000, emi: 3000, note: 'Car' })
    expect(r).toMatchObject({ ok: false, why: expect.stringMatching(/person who will repay it/) })
    expect(currentLoans()).toHaveLength(before)
  })

  it('never writes into the seed', () => {
    requestLoan(US, { who: 'us', kind: 'advance', amt: 8000, emi: 8000, note: 'Rent' })
    expect(LOANS.some((l) => l.who === 'us' && l.note === 'Rent')).toBe(false)
  })
})

describe('decideLoan', () => {
  it('approves a request, stamping who and when, and starts its schedule', () => {
    expect(decideLoan({ id: 'hw', r: 'admin' }, 'L8', 'approve')).toEqual({ ok: true, st: 'active' })
    expect(loan('L8')).toMatchObject({ st: 'active', decidedBy: 'hw', decidedAt: SEED_NOW, takenOn: SEED_NOW })
  })

  it('rejects a request without starting a schedule', () => {
    decideLoan({ id: 'hw', r: 'admin' }, 'L9', 'reject')
    expect(loan('L9')).toMatchObject({ st: 'rejected', decidedBy: 'hw' })
    expect(loan('L9')?.takenOn).toBeUndefined()
  })

  it('pauses and resumes an active loan', () => {
    expect(decideLoan({ id: 'hw', r: 'admin' }, 'L1', 'pause').ok).toBe(true)
    expect(loan('L1')?.st).toBe('paused')
    expect(decideLoan({ id: 'hw', r: 'admin' }, 'L1', 'resume').ok).toBe(true)
    expect(loan('L1')?.st).toBe('active')
  })

  it('refuses a move the status does not allow, and changes nothing', () => {
    const r = decideLoan({ id: 'hw', r: 'admin' }, 'L6', 'pause')
    expect(r.ok).toBe(false)
    expect(loan('L6')?.st).toBe('closed')
  })

  it('refuses the requester deciding their own request', () => {
    expect(decideLoan({ id: 'sr', r: 'admin' }, 'L8', 'approve')).toEqual({ ok: false, reason: 'You cannot decide your own request' })
    expect(loan('L8')?.st).toBe('requested')
  })

  it('refuses a loan that is not there', () => {
    expect(decideLoan({ id: 'hw', r: 'admin' }, 'L999', 'approve')).toEqual({ ok: false, reason: 'No such loan' })
  })
})

describe('recoverForRun', () => {
  it('records one instalment per active loan due, and adds it to what was paid', () => {
    setClock(() => new Date(2026, 5, 10))
    decideLoan({ id: 'hw', r: 'admin' }, 'L8', 'approve')
    recoverForRun({ id: 'hw', r: 'admin' }, 'Jul 2026', ['sr'])

    const paid = currentLoanPayments().filter((p) => p.loanId === 'L8')
    expect(paid).toHaveLength(1)
    expect(paid[0]).toMatchObject({ mn: 'Jul 2026', amt: 5000 })
    expect(loan('L8')?.paid).toBe(5000)
  })

  it('does not record a month twice', () => {
    setClock(() => new Date(2026, 5, 10))
    decideLoan({ id: 'hw', r: 'admin' }, 'L8', 'approve')
    recoverForRun({ id: 'hw', r: 'admin' }, 'Jul 2026', ['sr'])
    recoverForRun({ id: 'hw', r: 'admin' }, 'Jul 2026', ['sr'])
    expect(currentLoanPayments().filter((p) => p.loanId === 'L8')).toHaveLength(1)
  })

  it('leaves out people not on the run, and loans that are paused', () => {
    recoverForRun({ id: 'hw', r: 'admin' }, 'Aug 2026', ['rm'])
    expect(currentLoanPayments().filter((p) => p.mn === 'Aug 2026').map((p) => p.loanId)).toEqual(['L1'])
    expect(currentLoanPayments().some((p) => p.loanId === 'L5' && p.mn === 'Aug 2026')).toBe(false)
  })

  it('closes a loan the instalment clears', () => {
    recoverForRun({ id: 'hw', r: 'admin' }, 'Aug 2026', ['sm'])
    expect(loan('L4')).toMatchObject({ paid: 12000, st: 'closed' })
  })

  it('does nothing at all when nothing is due', () => {
    const before = currentLoanPayments()
    recoverForRun({ id: 'hw', r: 'admin' }, 'Aug 2026', ['nobody'])
    expect(currentLoanPayments()).toBe(before)
  })

  it('never writes into the seed', () => {
    recoverForRun({ id: 'hw', r: 'admin' }, 'Aug 2026', ['rm', 'sm'])
    expect(LOANPAYMENTS.some((p) => p.mn === 'Aug 2026')).toBe(false)
    expect(LOANS.find((l) => l.id === 'L4')?.st).toBe('active')
    expect(LOANEVENTS.some((e) => e.action === 'closed' && e.loanId === 'L4')).toBe(false)
  })
})

describe('who decides a loan', () => {
  it('refuses someone without “pricing”, even from a screen that let them try', () => {
    expect(decideLoan({ id: 'sk', r: 'lead' }, 'L8', 'approve')).toMatchObject({ ok: false, reason: expect.stringMatching(/“pricing”/) })
    expect(recoverForRun({ id: 'sk', r: 'lead' }, 'Aug 2026', ['rm'])).toMatch(/“pricing”/)
  })
})
