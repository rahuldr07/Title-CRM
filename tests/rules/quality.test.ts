import { describe, expect, it } from 'vitest'
import { QC_FIX, QC_REASONS } from '@/data/quality'
import { QC_CRITERIA, QC_SCALE, markTone, scoreBand } from '@/lib/quality'

/**
 * The rating vocabulary has to stay closed.
 *
 * A rater picks an axis, a score and a reason; the personal report then answers
 * "what should I do differently" by looking that reason up in `QC_FIX`. A reason
 * with no entry there leaves somebody holding a defect and no next step, which
 * is the one thing that page exists to prevent — and nothing in the type system
 * connects the two lists.
 */

describe('every defect a rater can pick', () => {
  it('has a practice that prevents it', () => {
    const reasons = Object.values(QC_REASONS).flat()
    const missing = reasons.filter((r) => !QC_FIX[r])
    expect(missing).toEqual([])
  })

  it('has no practice recorded for a reason nobody can pick', () => {
    const reasons = new Set(Object.values(QC_REASONS).flat())
    const orphaned = Object.keys(QC_FIX).filter((k) => !reasons.has(k))
    expect(orphaned).toEqual([])
  })

  it('is filed under an axis the rating form offers', () => {
    const axes = QC_CRITERIA.map(([name]) => name)
    expect(Object.keys(QC_REASONS).sort()).toEqual([...axes].sort())
  })
})

describe('the scale', () => {
  /* 1 is the worst outcome and 5 the best — the opposite of what most people
     assume, which is why the screens say so out loud. */
  it('runs 1 to 5 with 1 the worst', () => {
    expect(QC_SCALE.map(([n]) => n)).toEqual([1, 2, 3, 4, 5])
    expect(QC_SCALE[0][2]).toBe('d')
    expect(QC_SCALE[4][2]).toBe('v')
  })
})

describe('the band an average falls in', () => {
  it('reads as a share of the top of the scale', () => {
    expect(scoreBand(5).pct).toBe(100)
    expect(scoreBand(4.62).pct).toBe(92)
    expect(scoreBand(1).pct).toBe(20)
  })

  it('cuts at 4.5 and 4', () => {
    expect(scoreBand(4.5).label).toBe('Excellent')
    expect(scoreBand(4.49).tone).toBe('warn')
    expect(scoreBand(4).tone).toBe('warn')
    expect(scoreBand(3.99).tone).toBe('bad')
  })

  /* A person whose every mark was a 4 should not read better or worse on My
     work than a single 4 reads on the ratings table. */
  it('agrees with the mark tone on a whole number', () => {
    for (const [n] of QC_SCALE) expect(scoreBand(n).tone).toBe(markTone(n))
  })

  it('never draws past a full ring', () => {
    expect(scoreBand(7).pct).toBe(100)
    expect(scoreBand(-1).pct).toBe(0)
  })
})
