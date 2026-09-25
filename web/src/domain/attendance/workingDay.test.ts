import { describe, expect, it } from 'vitest'
import {
  distance,
  hhmm,
  hm,
  lateBy,
  metres,
  mins,
  placeOf,
  restCheck,
  shiftByKey,
  shiftOf,
  withLocation,
  worked,
} from './workingDay'
import { SHIFTS, SITES } from '@/data/people'
import { TIMECFG } from '@/data/hrms'
import type { DayMark } from '@/data/types'
import { must } from '../../../tests/must'

const mark = (over: Partial<DayMark>): DayMark => ({
  in: '09:30',
  out: null,
  late: 0,
  shift: 'day',
  where: 'Bengaluru office',
  inside: true,
  acc: 10,
  ...over,
})

describe('clock arithmetic', () => {
  it('reads a clock time as minutes past midnight, and anything unreadable as zero', () => {
    expect(mins('09:30')).toBe(570)
    expect(mins('00:00')).toBe(0)
    expect(mins('23:59')).toBe(1439)
    expect(mins('')).toBe(0)
    expect(mins('x:y')).toBe(0)
  })

  it('writes minutes as hours and padded minutes', () => {
    expect(hm(125)).toBe('2h 05m')
    expect(hm(0)).toBe('0h 00m')
    expect(hm(600)).toBe('10h 00m')
  })

  it('writes a date as a padded 24-hour clock time', () => {
    expect(hhmm(new Date(2026, 7, 3, 9, 5))).toBe('09:05')
    expect(hhmm(new Date(2026, 7, 3, 21, 45))).toBe('21:45')
  })
})

describe('worked', () => {
  it('is the time between check-in and check-out', () => {
    expect(worked(mark({ in: '09:00', out: '17:30' }))).toBe(510)
  })

  it('is nothing until the day is closed, and never negative', () => {
    expect(worked(mark({ out: null }))).toBe(0)
    expect(worked(null)).toBe(0)
    expect(worked(undefined)).toBe(0)
    expect(worked(mark({ in: '18:00', out: '09:00' }))).toBe(0)
  })
})

describe('shifts', () => {
  it('finds a shift by its key, and falls back to the first for an unknown one', () => {
    expect(shiftByKey('day').n).toBe('India day')
    expect(shiftByKey('no-such-shift')).toBe(SHIFTS[0])
  })

  it('puts someone with no shift on the day shift', () => {
    expect(shiftOf({ shift: '' }).k).toBe('day')
  })
})

describe('lateBy', () => {
  const day = shiftByKey('day')

  it('forgives arrivals inside the grace period', () => {
    expect(lateBy(day.from, day)).toBe(0)
    expect(lateBy('09:40', day)).toBe(0)
    expect(TIMECFG.lateGraceMins).toBe(10)
  })

  it('counts every minute from the shift start once past the grace period', () => {
    expect(lateBy('09:41', day)).toBe(11)
    expect(lateBy('10:30', day)).toBe(60)
  })

  it('is never negative for an early arrival', () => {
    expect(lateBy('08:00', day)).toBe(0)
  })
})

describe('restCheck', () => {
  it('has nothing to say before check-in or before the rest threshold', () => {
    expect(restCheck(null, '12:00')).toBeNull()
    expect(restCheck(mark({ in: '09:00' }), '13:59')).toBeNull()
  })

  it('is satisfied by a long enough break', () => {
    const r = restCheck(mark({ in: '09:00', out: '15:30', breakMins: 30 }), '20:00')
    expect(r?.ok).toBe(true)
    expect(r?.msg).toContain('30 minutes of break')
  })

  it('warns when the required rest has not been taken, reading the clock while the day is open', () => {
    const r = restCheck(mark({ in: '09:00', breakMins: 10 }), '15:00')
    expect(r?.ok).toBe(false)
    expect(r?.msg).toContain(`A rest of ${TIMECFG.restMins} minutes is required`)
    expect(r?.msg).toContain('5h 50m worked with 10 minutes break')
  })

  it('says no break rather than zero minutes', () => {
    expect(restCheck(mark({ in: '09:00' }), '15:00')?.msg).toContain('with no break')
  })
})

describe('where a punch was made', () => {
  const site = must(SITES[0], 'a site')

  it('measures the distance between two points in metres', () => {
    expect(metres(site.lat, site.lng, site.lat, site.lng)).toBe(0)
    expect(metres(0, 0, 0, 1)).toBeGreaterThan(111000)
    expect(metres(0, 0, 0, 1)).toBeLessThan(112000)
  })

  it('writes a distance in metres, or kilometres past one', () => {
    expect(distance(200)).toBe('200 m')
    expect(distance(1000)).toBe('1.0 km')
    expect(distance(1540)).toBe('1.5 km')
  })

  it('places a fix inside a site when within its radius', () => {
    expect(placeOf({ lat: site.lat, lng: site.lng, acc: 5 }, null)).toEqual({ where: site.n, inside: true })
  })

  it('says how far away a fix outside every site was', () => {
    const r = placeOf({ lat: site.lat + 0.05, lng: site.lng, acc: 5 }, null)
    expect(r.inside).toBe(false)
    expect(r.where).toMatch(new RegExp(`km from ${site.n}$`))
  })

  it('carries the reason when there is no fix', () => {
    expect(placeOf(null, 'Location permission was refused')).toEqual({
      where: 'Location permission was refused',
      inside: false,
    })
    expect(placeOf(null, null)).toEqual({ where: 'Location not recorded', inside: false })
  })

  it('answers at once, without a fix, where the device cannot report a location', () => {
    let got: [unknown, unknown] | null = null
    withLocation((fix, err) => {
      got = [fix, err]
    })
    expect(got).toEqual([null, 'This device cannot report a location'])
  })
})
