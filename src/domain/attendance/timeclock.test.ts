import { describe, expect, it } from 'vitest'
import { breakStart, checkIn, currentLedger, decideCorrection, decideSwap, requestSwap, setWaived } from './timeclock'
import * as attendance from './attendance'
import { OWN_REQUEST } from '@/domain/auth/permissions'
import { payslipOf } from '@/domain/payroll/payroll'
import { currentStaff } from '@/domain/people/roster'
import { SWAPS } from '@/data/attendance'
import { must } from '../../../tests/must'
import { applyDateFormat } from '@/shared/lib/format'
import { setClock } from '@/shared/lib/clock'

const UMA = { id: 'us', r: 'staff', n: 'Uma Sankar' }
const LEAD = { id: 'sk', r: 'lead', n: 'Ashok S' }

describe('the timeclock ledger', () => {
  it('records your own day and nobody else’s', () => {
    expect(checkIn(LEAD, 'us', null, 'no fix')).toMatch(/your own day/)
    expect(checkIn(UMA, 'us', null, 'no fix')).toMatch(/Checked in/)
    expect(breakStart(UMA, 'us')).toBe('Break started')
  })

  it('asks for a swap only as the person giving up the shift', () => {
    expect(requestSwap(LEAD, 'us', 'sm', '08/10/2026', 'Wedding')).toMatch(/giving up the shift/)
    expect(requestSwap(UMA, 'us', 'sm', '08/10/2026', 'Wedding')).toBeNull()
    expect(SWAPS.some((s) => s.why === 'Wedding')).toBe(false)
  })

  it('leaves decisions and waivers to someone holding “all”', () => {
    const swap = must(SWAPS.find((s) => s.st === 'pending' && s.from !== 'jr' && s.to !== 'jr'), 'a pending swap')
    expect(decideSwap({ id: 'jr', r: 'staff', n: 'JP Ramesh' }, swap.id, 'approved')).toMatch(/“all”/)
    expect(setWaived(UMA, 'x', true)).toMatch(/“all”/)
    expect(decideSwap(LEAD, swap.id, 'approved')).toBeNull()
    expect(swap.st).toBe('pending')
  })

  it('reads the swapped day in the company’s format and keeps it in the one stored form', () => {
    applyDateFormat('DD/MM/YYYY')
    expect(requestSwap(UMA, 'us', 'sm', '10/08/2026', 'Wedding')).toBeNull()
    expect(currentLedger().swaps[0]?.d).toBe('08/10/2026')
    expect(requestSwap(UMA, 'us', 'sm', '08/31/2026', 'Wedding')).toBe('Write the day as DD/MM/YYYY.')
  })

  it('stamps a punch on the India clock the shifts are written in', () => {
    setClock(() => new Date(2026, 7, 3, 6, 20))
    expect(checkIn(UMA, 'us', null, 'no fix')).toBe('Checked in 20 minutes after 15:30 IST')
    expect(currentLedger().marks.us?.in).toBe('15:50')
    expect(currentLedger().punches[0]?.t).toBe('15:50')
  })
})

describe('deciding an attendance correction', () => {
  const JP = { id: 'jr', r: 'staff', n: 'JP Ramesh' }
  const pending = () => must(currentLedger().corrections.find((r) => r.st === 'pending' && r.who !== 'jr' && r.who !== 'sk'), 'a pending correction')
  const monthOfDate = (d: Date) => `${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`

  it('has one writer, and it checks the capability before anything moves', () => {
    expect('decideCorrection' in attendance).toBe(false)
    const r = pending()
    expect(decideCorrection(JP, r.id, 'approved')).toMatch(/“all”/)
    expect(currentLedger().corrections.find((x) => x.id === r.id)?.st).toBe('pending')
  })

  it('records the decision on the one correction and leaves the rest waiting', () => {
    const r = pending()
    const others = currentLedger().corrections.filter((x) => x.id !== r.id)
    expect(decideCorrection(LEAD, r.id, 'approved')).toBeNull()
    expect(currentLedger().corrections.find((x) => x.id === r.id)?.st).toBe('approved')
    expect(currentLedger().corrections.filter((x) => x.id !== r.id)).toEqual(others)
  })

  it('refuses a decision on your own correction, whatever you hold', () => {
    const r = pending()
    expect(decideCorrection({ id: r.who, r: 'admin', n: 'Self' }, r.id, 'approved')).toBe(OWN_REQUEST)
  })

  it('says so for a correction that is not there', () => {
    expect(decideCorrection(LEAD, 'nope', 'rejected')).toMatch(/no longer waiting/)
  })

  it('does not move the payslip, because payroll reads the month totals and a correction carries no day total', () => {
    for (const r of currentLedger().corrections) {
      const person = currentStaff().find((s) => s.id === r.who)
      if (!person || r.who === LEAD.id) continue
      const mn = monthOfDate(r.d)
      const net = payslipOf(person, mn).net
      decideCorrection(LEAD, r.id, 'approved')
      expect(payslipOf(person, mn).net).toBe(net)
    }
  })
})
