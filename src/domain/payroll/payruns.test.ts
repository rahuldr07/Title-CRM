import { saveStaff } from '@/domain/people/roster'
import { describe, expect, it } from 'vitest'
import { payTotals, payslipOf } from './payroll'
import { runOf, setRunState } from './payruns'
import { setPayCfg } from '@/domain/company/company'
import { claimOvertime, currentOvertime, decideOvertime } from './overtime'
import { PAYRUNS } from '@/data/hrms'
import { STAFF } from '@/data/people'
import { must } from '../../../tests/must'

const BOSS = { id: 'hw', r: 'admin' }

const PAID = 'Mar 2026'
const DRAFT = 'Jul 2026'
const net = (mn: string) => payTotals(mn).net

describe('a pay run that is already paid', () => {
  it('keeps its net pay when a payroll setting changes', () => {
    const before = net(PAID)
    setPayCfg(BOSS, 'basicPct', '60')
    expect(net(PAID)).toBe(before)
  })

  it('keeps each person’s payslip when their CTC changes', () => {
    const p = must(payTotals(PAID).list[0], 'a payslip').p
    const before = payslipOf(p, PAID).net
    saveStaff({ id: 'hw', r: 'admin' }, { ...p, ctc: (p.ctc ?? 0) * 2 }, p.id)
    expect(payslipOf({ ...p, ctc: (p.ctc ?? 0) * 2 }, PAID).net).toBe(before)
  })
})

describe('a pay run still in draft', () => {
  it('follows a change to the settings', () => {
    const before = net(DRAFT)
    setPayCfg(BOSS, 'basicPct', '60')
    expect(net(DRAFT)).not.toBe(before)
  })

  it('follows a change to someone’s CTC', () => {
    const p = must(payTotals(DRAFT).list[0], 'a payslip').p
    const before = payslipOf(p, DRAFT).net
    saveStaff({ id: 'hw', r: 'admin' }, { ...p, ctc: (p.ctc ?? 0) * 2 }, p.id)
    expect(payTotals(DRAFT).list.find((x) => x.p.id === p.id)!.net).toBeGreaterThan(before)
  })
})

describe('approving a run', () => {
  it('closes it to later changes', () => {
    setRunState({ id: 'hw', r: 'admin', n: 'Harry Whitfield' }, DRAFT, 'locked')
    setRunState({ id: 'hw', r: 'admin', n: 'Harry Whitfield' }, DRAFT, 'approved')
    const approved = net(DRAFT)
    setPayCfg(BOSS, 'basicPct', '60')
    expect(net(DRAFT)).toBe(approved)
  })

  it('records who approved it', () => {
    setRunState({ id: 'hw', r: 'admin', n: 'Harry Whitfield' }, DRAFT, 'locked')
    setRunState({ id: 'hw', r: 'admin', n: 'Harry Whitfield' }, DRAFT, 'approved')
    expect(runOf(DRAFT)?.state).toBe('approved')
    expect(runOf(DRAFT)?.by).toBe('Harry Whitfield')
  })

  it('publishes on paid', () => {
    setRunState({ id: 'hw', r: 'admin', n: 'Harry Whitfield' }, DRAFT, 'locked')
    setRunState({ id: 'hw', r: 'admin', n: 'Harry Whitfield' }, DRAFT, 'approved')
    setRunState({ id: 'hw', r: 'admin', n: 'Harry Whitfield' }, DRAFT, 'paid')
    expect(runOf(DRAFT)?.published).toBe(true)
  })

  it('leaves the bundled seed alone', () => {
    const before = JSON.stringify(PAYRUNS)
    setRunState({ id: 'hw', r: 'admin', n: 'Harry Whitfield' }, DRAFT, 'locked')
    setRunState({ id: 'hw', r: 'admin', n: 'Harry Whitfield' }, DRAFT, 'approved')
    expect(JSON.stringify(PAYRUNS)).toBe(before)
  })

  it('starts every test from the seed', () => {
    expect(runOf(DRAFT)?.state).toBe(PAYRUNS[DRAFT]?.state)
    expect(STAFF.length).toBeGreaterThan(0)
  })
})

describe('overtime', () => {
  const harry = { id: 'hw', n: 'Harry Whitfield', r: 'admin' }
  const gross = (id: string, mn: string) => payTotals(mn).list.find((x) => x.p.id === id)!.gross

  it('is paid in the draft month once approved', () => {
    const before = gross('us', DRAFT)
    claimOvertime({ id: 'us', r: 'staff' }, 'us', '07/28/2026', 120, 'Cleared the backlog')
    const id = must(currentOvertime()[0], 'the claim just made').id
    expect(gross('us', DRAFT)).toBe(before)
    decideOvertime(harry, id, 'approved')
    expect(gross('us', DRAFT)).toBeGreaterThan(before)
  })

  it('cannot be approved by the person who worked it', () => {
    claimOvertime({ id: 'sk', r: 'staff' }, 'sk', '07/28/2026', 60, 'Late handover')
    const id = must(currentOvertime()[0], 'the claim just made').id
    expect(decideOvertime({ id: 'sk', n: 'Ashok S', r: 'lead' }, id, 'approved')).toMatch(/yours/i)
    expect(currentOvertime()[0]?.st).toBe('pending')
  })

  it('approved after a month is paid, leaves that month alone', () => {
    const before = gross('us', PAID)
    claimOvertime({ id: 'us', r: 'staff' }, 'us', '03/20/2026', 180, 'Month-end rush')
    decideOvertime(harry, must(currentOvertime()[0], 'the claim just made').id, 'approved')
    expect(gross('us', PAID)).toBe(before)
  })

  it('records who decided it', () => {
    claimOvertime({ id: 'us', r: 'staff' }, 'us', '07/28/2026', 30, 'x')
    decideOvertime(harry, must(currentOvertime()[0], 'the claim just made').id, 'rejected')
    expect(currentOvertime()[0]).toMatchObject({ st: 'rejected', by: 'Harry Whitfield' })
  })
})

describe('moving a pay run on', () => {
  it('refuses someone without “pricing”', () => {
    expect(setRunState({ id: 'sk', r: 'lead', n: 'Ashok S' }, DRAFT, 'locked')).toMatch(/“pricing”/)
    expect(runOf(DRAFT)?.state).toBe('draft')
  })
})
