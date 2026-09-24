import { describe, expect, it } from 'vitest'
import { payTotals, payslipOf } from '@/lib/payroll'
import { runOf, setRunState } from '@/state/payruns'
import { saveStaff, setPayCfg } from '@/state/company'
import { claimOvertime, currentOvertime, decideOvertime } from '@/state/overtime'
import { PAYRUNS } from '@/data/hrms'
import { STAFF } from '@/data/people'

/**
 * A closed pay run is a record, not a formula.
 *
 * Every payslip used to be recomputed from today's settings, so moving Basic
 * from 50% to 60% of CTC rewrote March — a month already marked Paid — from
 * ₹7,98,948 to ₹7,86,067. Approval is where the month closes ("after this the
 * month is closed to edits", RUNSTEPS), so that is where the settings and the
 * roster are kept with the run, and a closed run reads only from what it kept.
 */

const PAID = 'Mar 2026'
const DRAFT = 'Jul 2026'
const net = (mn: string) => payTotals(mn).net

describe('a pay run that is already paid', () => {
  it('keeps its net pay when a payroll setting changes', () => {
    const before = net(PAID)
    setPayCfg('basicPct', '60')
    expect(net(PAID)).toBe(before)
  })

  it('keeps each person’s payslip when their CTC changes', () => {
    const p = payTotals(PAID).list[0].p
    const before = payslipOf(p, PAID).net
    saveStaff({ ...p, ctc: (p.ctc ?? 0) * 2 }, p.id)
    expect(payslipOf({ ...p, ctc: (p.ctc ?? 0) * 2 }, PAID).net).toBe(before)
  })
})

describe('a pay run still in draft', () => {
  it('follows a change to the settings', () => {
    const before = net(DRAFT)
    setPayCfg('basicPct', '60')
    expect(net(DRAFT)).not.toBe(before)
  })

  it('follows a change to someone’s CTC', () => {
    const p = payTotals(DRAFT).list[0].p
    const before = payslipOf(p, DRAFT).net
    saveStaff({ ...p, ctc: (p.ctc ?? 0) * 2 }, p.id)
    expect(payTotals(DRAFT).list.find((x) => x.p.id === p.id)!.net).toBeGreaterThan(before)
  })
})

describe('approving a run', () => {
  it('closes it to later changes', () => {
    setRunState(DRAFT, 'locked', 'Harry Whitfield')
    setRunState(DRAFT, 'approved', 'Harry Whitfield')
    const approved = net(DRAFT)
    setPayCfg('basicPct', '60')
    expect(net(DRAFT)).toBe(approved)
  })

  it('records who approved it', () => {
    setRunState(DRAFT, 'locked', 'Harry Whitfield')
    setRunState(DRAFT, 'approved', 'Harry Whitfield')
    expect(runOf(DRAFT)?.state).toBe('approved')
    expect(runOf(DRAFT)?.by).toBe('Harry Whitfield')
  })

  it('publishes on paid', () => {
    setRunState(DRAFT, 'locked', 'Harry Whitfield')
    setRunState(DRAFT, 'approved', 'Harry Whitfield')
    setRunState(DRAFT, 'paid', 'Harry Whitfield')
    expect(runOf(DRAFT)?.published).toBe(true)
  })

  it('leaves the bundled seed alone', () => {
    const before = JSON.stringify(PAYRUNS)
    setRunState(DRAFT, 'locked', 'Harry Whitfield')
    setRunState(DRAFT, 'approved', 'Harry Whitfield')
    expect(JSON.stringify(PAYRUNS)).toBe(before)
  })

  it('starts every test from the seed', () => {
    expect(runOf(DRAFT)?.state).toBe(PAYRUNS[DRAFT]?.state)
    expect(STAFF.length).toBeGreaterThan(0)
  })
})

/*
 * Approved overtime is paid.
 *
 * The attendance screen says approving overtime "adds the hours to their next
 * payslip", but payroll read the bundled overtime list while approvals were
 * written to a private copy — so nothing approved on screen was ever paid.
 */
describe('overtime', () => {
  const harry = { id: 'hw', n: 'Harry Whitfield' }
  const gross = (id: string, mn: string) => payTotals(mn).list.find((x) => x.p.id === id)!.gross

  it('is paid in the draft month once approved', () => {
    const before = gross('us', DRAFT)
    claimOvertime('us', '07/28/2026', 120, 'Cleared the backlog')
    const id = currentOvertime()[0].id
    expect(gross('us', DRAFT)).toBe(before)
    decideOvertime(id, 'approved', harry)
    expect(gross('us', DRAFT)).toBeGreaterThan(before)
  })

  it('cannot be approved by the person who worked it', () => {
    claimOvertime('sk', '07/28/2026', 60, 'Late handover')
    const id = currentOvertime()[0].id
    expect(decideOvertime(id, 'approved', { id: 'sk', n: 'Ashok S' })).toMatch(/yours/i)
    expect(currentOvertime()[0].st).toBe('pending')
  })

  it('approved after a month is paid, leaves that month alone', () => {
    const before = gross('us', PAID)
    claimOvertime('us', '03/20/2026', 180, 'Month-end rush')
    decideOvertime(currentOvertime()[0].id, 'approved', harry)
    expect(gross('us', PAID)).toBe(before)
  })

  it('records who decided it', () => {
    claimOvertime('us', '07/28/2026', 30, 'x')
    decideOvertime(currentOvertime()[0].id, 'rejected', harry)
    expect(currentOvertime()[0]).toMatchObject({ st: 'rejected', by: 'Harry Whitfield' })
  })
})
