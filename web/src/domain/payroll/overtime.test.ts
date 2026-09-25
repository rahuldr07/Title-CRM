import { describe, expect, it } from 'vitest'
import { claimOvertime, currentOvertime, decideOvertime } from './overtime'
import { OT } from '@/data/hrms'
import { must } from '../../../tests/must'
import { applyDateFormat } from '@/shared/lib/format'

const UMA = { id: 'us', r: 'staff', n: 'Uma Sankar' }
const JP = { id: 'jr', r: 'staff', n: 'JP Ramesh' }
const LEAD = { id: 'sk', r: 'lead', n: 'Ashok S' }

describe('an overtime claim', () => {
  it('is made by the person who worked it, and nobody else', () => {
    expect(claimOvertime(JP, 'us', '07/28/2026', 60, 'x')).toMatch(/person who worked it/)
    expect(claimOvertime(UMA, 'us', '07/28/2026', 60, 'Cleared the backlog')).toBeNull()
    expect(currentOvertime()[0]).toMatchObject({ who: 'us', st: 'pending' })
    expect(OT.some((o) => o.why === 'Cleared the backlog')).toBe(false)
  })

  it('is decided only by someone holding “all”', () => {
    claimOvertime(UMA, 'us', '07/28/2026', 60, 'Cleared the backlog')
    const id = must(currentOvertime()[0], 'the claim').id
    expect(decideOvertime(JP, id, 'approved')).toMatch(/“all”/)
    expect(currentOvertime()[0]?.st).toBe('pending')
    expect(decideOvertime(LEAD, id, 'approved')).toBeNull()
  })

  it('reads the day in the company’s format and keeps it in the one stored form', () => {
    applyDateFormat('DD/MM/YYYY')
    expect(claimOvertime(UMA, 'us', '28/07/2026', 60, 'Cleared the backlog')).toBeNull()
    expect(currentOvertime()[0]?.d).toBe('07/28/2026')
  })

  it('names the format when the day cannot be read', () => {
    applyDateFormat('DD/MM/YYYY')
    expect(claimOvertime(UMA, 'us', '07/28/2026', 60, 'x')).toBe('Write the day as DD/MM/YYYY.')
    expect(currentOvertime().some((o) => o.why === 'x')).toBe(false)
  })
})
