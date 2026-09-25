import { describe, expect, it } from 'vitest'
import { addLead, currentLeads, followUpCount, leadById, updateLead } from './leads'
import { LEADS } from '@/data/business'
import { must } from '../../../tests/must'

const ADMIN = { id: 'hw', r: 'admin' }
const LEAD = { id: 'sk', r: 'lead' }

const fresh = {
  co: 'Lone Star Abstract',
  loc: 'Austin, TX',
  st: 'new' as const,
  own: 'hw',
  contacts: [{ n: 'Dana Ruiz', role: 'Orders', e: 'dana@lonestar.example', p: '' }],
  notes: [{ w: 'hw', at: new Date(2026, 7, 3), t: 'Met at the land title conference.' }],
}

describe('the lead book', () => {
  it('adds a lead to the book, never to the seed', () => {
    const seeded = LEADS.length
    const out = addLead(ADMIN, fresh)
    expect(out.refused).toBeNull()
    expect(leadById(must(out.id, 'the new id'))?.co).toBe('Lone Star Abstract')
    expect(currentLeads()).toHaveLength(seeded + 1)
    expect(LEADS).toHaveLength(seeded)
  })

  it('refuses someone without “pricing”, since a lead carries what a client is charged', () => {
    expect(addLead(LEAD, fresh).refused).toMatch(/“pricing”/)
    const first = must(currentLeads()[0], 'a lead')
    expect(updateLead(LEAD, first.id, (l) => ({ ...l, flag: true }))).toMatch(/“pricing”/)
  })

  it('edits a copy, so the seed record is untouched and the count follows', () => {
    const quiet = must(currentLeads().find((l) => !l.flag && !['won', 'lost'].includes(l.st)), 'an unflagged open lead')
    const before = followUpCount()
    const wasFlag = quiet.flag
    expect(updateLead(ADMIN, quiet.id, (l) => ({ ...l, flag: true }))).toBeNull()
    expect(leadById(quiet.id)?.flag).toBe(true)
    expect(LEADS.find((l) => l.id === quiet.id)?.flag).toBe(wasFlag)
    expect(followUpCount()).toBeGreaterThanOrEqual(before)
  })
})
