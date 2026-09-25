import { describe, expect, it } from 'vitest'
import type { QcEntry } from '@/data/quality'
import { scoreSpread } from './performance'

const entry = (x: Partial<QcEntry>): QcEntry => x as QcEntry

describe('scoreSpread', () => {
  it('is the lowest and highest per-person average', () => {
    const log = [
      entry({ onName: 'A', avg: 4 }),
      entry({ onName: 'A', avg: 5 }),
      entry({ onName: 'B', avg: 3 }),
      entry({ onName: 'C', avg: 4.8 }),
    ]
    expect(scoreSpread(log)).toEqual({ lo: 3, hi: 4.8 })
  })

  it('is null for an empty log', () => {
    expect(scoreSpread([])).toBeNull()
  })
})
