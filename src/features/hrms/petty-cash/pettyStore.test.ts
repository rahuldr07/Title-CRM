import { describe, expect, it } from 'vitest'
import { recordCount, setConfig } from './pettyStore'
import { PETTYCFG } from '@/data/hrms'

describe('the petty-cash book', () => {
  it('refuses a change from someone without “pricing”, and never writes the seed', () => {
    expect(setConfig({ id: 'sk', r: 'lead' }, 'limit', 9000)).toMatch(/“pricing”/)
    expect(recordCount({ id: 'sk', r: 'lead' }, { d: new Date(2026, 7, 3), by: 'Ashok S', counted: 1, note: '' })).toMatch(/“pricing”/)
    expect(setConfig({ id: 'hw', r: 'admin' }, 'limit', 9000)).toBeNull()
    expect(PETTYCFG.limit).toBe(5000)
  })
})
