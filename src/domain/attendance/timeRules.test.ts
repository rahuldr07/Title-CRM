import { describe, expect, it } from 'vitest'
import { currentTimeRules, setTimeRule } from './timeRules'
import { TIMECFG } from '@/data/hrms'

describe('the attendance and overtime rules', () => {
  it('change only for someone holding “people”, and never in the seed', () => {
    expect(setTimeRule({ id: 'sk', r: 'lead' }, 'lateGraceMins', 20)).toMatch(/“people”/)
    expect(setTimeRule({ id: 'hw', r: 'admin' }, 'lateGraceMins', 20)).toBeNull()
    expect(currentTimeRules().lateGraceMins).toBe(20)
    expect(TIMECFG.lateGraceMins).toBe(10)
  })
})
