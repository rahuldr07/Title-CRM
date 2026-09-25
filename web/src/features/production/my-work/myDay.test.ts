import { describe, expect, it } from 'vitest'
import { greeting, nextHolidayFrom } from './myDay'

describe('greeting', () => {
  it('is morning before noon, afternoon until five, evening after', () => {
    expect(greeting(0)).toBe('morning')
    expect(greeting(11)).toBe('morning')
    expect(greeting(12)).toBe('afternoon')
    expect(greeting(16)).toBe('afternoon')
    expect(greeting(17)).toBe('evening')
    expect(greeting(23)).toBe('evening')
  })
})

describe('nextHolidayFrom', () => {
  const holidays = [
    { d: '12/25/2026', n: 'Christmas', opt: false },
    { d: '08/15/2026', n: 'Independence Day', opt: false },
    { d: '07/04/2026', n: 'Fourth of July', opt: true },
  ]

  it('picks the earliest holiday on or after the day, whatever the list order', () => {
    expect(nextHolidayFrom(holidays, new Date(2026, 7, 3))?.h.n).toBe('Independence Day')
  })

  it('counts a holiday falling on the day itself', () => {
    expect(nextHolidayFrom(holidays, new Date(2026, 7, 15))?.h.n).toBe('Independence Day')
  })

  it('carries the parsed date', () => {
    expect(nextHolidayFrom(holidays, new Date(2026, 7, 3))?.dt).toEqual(new Date(2026, 7, 15))
  })

  it('is undefined once every holiday has passed', () => {
    expect(nextHolidayFrom(holidays, new Date(2027, 0, 1))).toBeUndefined()
  })
})
