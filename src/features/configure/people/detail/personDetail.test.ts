import { describe, expect, it } from 'vitest'
import type { QcEntry } from '@/data/quality'
import {
  CONTACT_WITHHELD,
  STATUTORY_WITHHELD,
  checksOf,
  contactRows,
  emergencyView,
  maskAadhaar,
  personAccess,
  PERFORMANCE_WITHHELD,
} from './personDetail'

const entry = (over: Partial<QcEntry>): QcEntry => ({
  d: new Date(2026, 7, 3),
  order: 'O1',
  cl: 'MGR',
  pr: '40Y',
  stage: 'Search',
  on: 'us',
  onName: 'Uma Sankar',
  by: 'rm',
  byName: 'Ravi M',
  acc: 5,
  comp: 5,
  fmt: 5,
  avg: 5,
  defect: false,
  crit: null,
  note: null,
  ...over,
})

describe('an Aadhaar number on a person page', () => {
  it('shows only its last four digits', () => {
    expect(maskAadhaar('1234 5678 9012')).toBe('XXXX XXXX 9012')
  })

  it('shows nothing when there is none on record', () => {
    expect(maskAadhaar('')).toBe('')
  })
})

describe('the checks a KPI opens', () => {
  const clean = entry({ order: 'A' })
  const flagged = entry({ order: 'B', crit: 'Accuracy', avg: 4.33 })
  const defect = entry({ order: 'C', crit: 'Accuracy', defect: true, avg: 3 })
  const rated = [clean, flagged, defect]
  const given = [entry({ order: 'G' })]

  it('are every rating for all', () => {
    expect(checksOf('all', rated, given)).toEqual(rated)
  })

  it('are only the defects for defect', () => {
    expect(checksOf('defect', rated, given)).toEqual([defect])
  })

  it('are the ones with nothing raised for clean', () => {
    expect(checksOf('clean', rated, given)).toEqual([clean])
  })

  it('are the ratings they gave for gave', () => {
    expect(checksOf('gave', rated, given)).toEqual(given)
  })
})

describe('what a viewer gets of a person', () => {
  const holding = (...caps: string[]) => (c: string) => caps.includes(c)

  it('shows staff their own statutory and bank details, without the editor', () => {
    expect(personAccess('us', 'us', holding('own', 'qc'))).toEqual({ personal: true, performance: true, edit: false })
  })

  it('shows staff and leads nothing personal of someone else, and no editor', () => {
    expect(personAccess('us', 'hw', holding('own', 'qc')).personal).toBe(false)
    expect(personAccess('sk', 'us', holding('own', 'all', 'assign', 'qc'))).toMatchObject({ personal: false, edit: false })
  })

  it('gives someone holding “people” the details and the editor', () => {
    expect(personAccess('hw', 'us', holding('people'))).toEqual({ personal: true, performance: true, edit: true })
  })
})

describe('a colleague’s performance record', () => {
  const holding = (...caps: string[]) => (c: string) => caps.includes(c)

  it('is withheld from a peer who neither manages people nor gives out the work', () => {
    expect(personAccess('us', 'gk', holding('own', 'qc')).performance).toBe(false)
    expect(personAccess('us', 'gk', holding('own', 'all', 'qc')).performance).toBe(false)
  })

  it('is shown to the person themselves', () => {
    expect(personAccess('gk', 'gk', holding('own', 'qc')).performance).toBe(true)
  })

  it('is shown to whoever assigns the work, and to whoever manages people', () => {
    expect(personAccess('sk', 'gk', holding('own', 'all', 'assign', 'qc')).performance).toBe(true)
    expect(personAccess('hw', 'gk', holding('people')).performance).toBe(true)
  })

  it('says who can see it and why when it is withheld', () => {
    expect(PERFORMANCE_WITHHELD).toMatch(/“people” or “assign”/)
  })
})

describe('a colleague’s contact details', () => {
  const person = {
    mob: '+91 98400 12345',
    e: 'uma.sankar@keystoneabstract.com',
    addr: '14 Anna Salai, Chennai',
    emg: { n: 'Ravi Sankar', rel: 'Brother', mob: '+91 98400 67890' },
  }

  it('shows the home address only to someone allowed the personal record', () => {
    expect(contactRows(person, true).map((r) => r[0])).toEqual(['Mobile', 'Email', 'Address'])
    expect(contactRows(person, false).map((r) => r[0])).toEqual(['Mobile', 'Email'])
    expect(contactRows(person, false).flat()).not.toContain(person.addr)
  })

  it('leaves out a field that is empty', () => {
    expect(contactRows({ ...person, mob: '' }, true).map((r) => r[0])).toEqual(['Email', 'Address'])
  })

  it('withholds the emergency contact rather than reporting it missing', () => {
    expect(emergencyView(person, false)).toEqual({ kind: 'withheld' })
    expect(emergencyView({ emg: { n: '', rel: '', mob: '' } }, false)).toEqual({ kind: 'withheld' })
  })

  it('shows the emergency contact, or its absence, to someone allowed it', () => {
    expect(emergencyView(person, true)).toEqual({ kind: 'known', emg: person.emg })
    expect(emergencyView({ emg: { n: '', rel: '', mob: '' } }, true)).toEqual({ kind: 'none' })
  })

  it('names the capability that would show them, as the statutory card does', () => {
    expect(CONTACT_WITHHELD).toContain('“people” capability')
    expect(STATUTORY_WITHHELD).toContain('“people” capability')
    expect(CONTACT_WITHHELD.split(' need ')[1]).toBe(STATUTORY_WITHHELD.split(' need ')[1])
  })
})
