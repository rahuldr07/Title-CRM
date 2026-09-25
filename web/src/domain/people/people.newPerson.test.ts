import { describe, expect, it } from 'vitest'
import type { Person } from '@/data/types'
import { newPerson } from './people'
import { SHIFTS, STAFF } from '@/data/people'
import { celebrationsWithin } from './celebrations'

type RequiredKey<T> = {
  [K in keyof T]-?: Pick<T, K> extends Required<Pick<T, K>> ? K : never
}[keyof T]

const REQUIRED: Record<RequiredKey<Person>, true> = {
  id: true,
  n: true,
  dep: true,
  r: true,
  cap: true,
  open: true,
  avail: true,
  active: true,
  shift: true,
  mob: true,
  addr: true,
  emg: true,
  aadhaar: true,
  doj: true,
  dob: true,
  pan: true,
  uan: true,
  esicNo: true,
  bank: true,
  e: true,
}

const REQUIRED_KEYS = Object.keys(REQUIRED) as RequiredKey<Person>[]

const missingFrom = (rec: Partial<Person>) => REQUIRED_KEYS.filter((k) => rec[k] === undefined)

describe('a record the factory makes', () => {
  it('carries every field the type says it must', () => {
    expect(missingFrom(newPerson())).toEqual([])
  })

  it('unlike the shape the create path used to cast into place', () => {
    const asTheFormCollectsIt: Partial<Person> = {
      n: 'Meera Nair',
      e: 'meera.nair@keystoneabstract.com',
      r: 'staff',
      cap: 16,
      avail: 'ok',
      active: true,
      dep: ['Typing'],
      mob: '+91 98765 43210',
      addr: 'Indiranagar, Bengaluru',
      emg: { n: 'Arun Nair', rel: 'Spouse', mob: '+91 98765 43211' },
      doj: '08/03/2026',
      bank: { acct: '50100012345678', ifsc: 'HDFC0000123', name: 'Meera Nair' },
      pan: 'ABCPS1234D',
      uan: '100123456789',
      esicNo: '3100123456789',
      aadhaar: '1234 5678 9012',
    }

    expect(missingFrom(asTheFormCollectsIt)).toEqual(['id', 'open', 'shift', 'dob'])
  })

  it('agrees with the seeded roster about what complete means', () => {
    expect(STAFF.flatMap((p) => missingFrom(p).map((k) => `${p.n}: ${k}`))).toEqual([])
  })

  it('hands out its own arrays and objects', () => {
    const a = newPerson()
    const b = newPerson()

    a.dep.push('Search')
    a.emg.n = 'Arun Nair'
    a.bank.acct = '50100012345678'

    expect(b.dep).toEqual([])
    expect(b.emg.n).toBe('')
    expect(b.bank.acct).toBe('')
  })
})

describe('the three fields nobody types', () => {
  it('starts them holding nothing, as a number the day plan can add to', () => {
    expect(newPerson().open).toBe(0)
  })

  it('puts them on a shift the roster actually names', () => {
    const chosen = SHIFTS.find((s) => s.k === newPerson().shift)

    expect(chosen?.n).toBe('India day')
    expect(chosen?.from).toBe('09:30')
  })

  it('gives them no birthday rather than a placeholder one', () => {
    const joined: Person = { ...newPerson(), id: 'nw', n: 'New Joiner', doj: '08/03/2025' }

    const year = celebrationsWithin([joined], new Date(2026, 7, 3), 366)

    expect(year.map((c) => c.kind)).toEqual(['anniversary'])
    expect(year[0]?.years).toBe(1)
  })
})
