import { describe, expect, it } from 'vitest'
import type { QcEntry } from '@/data/quality'
import { linePath, weekTick, weeklyAverages } from './weekly'

const entry = (d: Date, avg: number): QcEntry => ({ d, avg }) as QcEntry

describe('weeklyAverages', () => {
  it('buckets seven-day weeks ending on the last day, oldest first', () => {
    const rows = [entry(new Date(2026, 7, 3), 4), entry(new Date(2026, 7, 1), 5), entry(new Date(2026, 6, 26), 3)]
    const weeks = weeklyAverages(rows, new Date(2026, 6, 21), new Date(2026, 7, 3))
    expect(weeks.map((w) => [w.from, w.to])).toEqual([
      [new Date(2026, 6, 21), new Date(2026, 6, 27)],
      [new Date(2026, 6, 28), new Date(2026, 7, 3)],
    ])
    expect(weeks.map((w) => [w.avg, w.n])).toEqual([
      [3, 1],
      [4.5, 2],
    ])
  })

  it('clips the first week to the start of the range', () => {
    const weeks = weeklyAverages([], new Date(2026, 6, 30), new Date(2026, 7, 3))
    expect(weeks).toEqual([{ from: new Date(2026, 6, 30), to: new Date(2026, 7, 3), avg: null, n: 0 }])
  })

  it('leaves a week with no checks empty rather than zero', () => {
    const weeks = weeklyAverages([entry(new Date(2026, 7, 3), 4)], new Date(2026, 6, 21), new Date(2026, 7, 3))
    expect(weeks[0]).toMatchObject({ avg: null, n: 0 })
  })

  it('keeps no more than twelve weeks, the most recent ones', () => {
    const weeks = weeklyAverages([], new Date(2026, 0, 1), new Date(2026, 7, 3))
    expect(weeks).toHaveLength(12)
    expect(weeks[11]?.to).toEqual(new Date(2026, 7, 3))
  })
})

describe('weekTick', () => {
  it('shows month and day only', () => {
    expect(weekTick(new Date(2026, 7, 3))).toBe('08/03')
  })
})

describe('linePath', () => {
  it('moves to the first point and draws lines through the rest', () => {
    expect(linePath([[0, 1], [2, 3], [4, 5]])).toBe('M 0 1 L 2 3 L 4 5')
  })

  it('lifts the pen over a gap', () => {
    expect(linePath([[0, 1], null, [4, 5], [6, 7]])).toBe('M 0 1 M 4 5 L 6 7')
  })

  it('is empty with no points', () => {
    expect(linePath([null, null])).toBe('')
  })
})
