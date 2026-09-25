import { describe, expect, it } from 'vitest'
import { median } from './stats'

describe('median', () => {
  it('sorts before it picks, so the caller need not', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([100, 1, 50])).toBe(50)
  })

  it('averages the two middles on an even count', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5)
    expect(median([2, 4, 6, 100])).toBe(5)
    expect(median([4, 1, 3, 2])).toBe(2.5)
  })

  it('is a median and not a mean, which is the whole reason it exists', () => {
    const hours = [22, 24, 26, 360]
    expect(median(hours)).toBe(25)
    expect(hours.reduce((a, b) => a + b, 0) / hours.length).toBe(108)
  })

  it('answers zero for an empty list', () => {
    expect(median([])).toBe(0)
  })

  it('answers a single value with itself', () => {
    expect(median([7])).toBe(7)
  })

  it('leaves the caller’s array in the order it was handed', () => {
    const xs = [3, 1, 2]
    median(xs)
    expect(xs).toEqual([3, 1, 2])
  })
})
