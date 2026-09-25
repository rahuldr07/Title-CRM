import { describe, expect, it } from 'vitest'
import { QC_FIX, QC_REASONS, type QcEntry } from '@/data/quality'
import { QC_CRITERIA, QC_SCALE, averageText, markTone, qcAverage, reasonCounts, scoreBand } from './quality'

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
  it('runs 1 to 5 with 1 the worst', () => {
    expect(QC_SCALE.map(([n]) => n)).toEqual([1, 2, 3, 4, 5])
    expect(QC_SCALE[0]?.[2]).toBe('d')
    expect(QC_SCALE[4]?.[2]).toBe('v')
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

  it('agrees with the mark tone on a whole number', () => {
    for (const [n] of QC_SCALE) expect(scoreBand(n).tone).toBe(markTone(n))
  })

  it('never draws past a full ring', () => {
    expect(scoreBand(7).pct).toBe(100)
    expect(scoreBand(-1).pct).toBe(0)
  })
})

describe('why marks came off', () => {
  const rating = (crit: string | null, note: string | null): QcEntry => ({
    d: new Date(2026, 7, 3),
    order: '4192254-2',
    cl: 'CSS',
    pr: '40Y',
    stage: 'Search',
    on: 'us',
    onName: 'Uma Sankar',
    by: 'rm',
    byName: 'Ravi M',
    acc: crit ? 4 : 5,
    comp: 5,
    fmt: 5,
    avg: crit ? 4.67 : 5,
    defect: false,
    crit,
    note,
  })

  it('counts each reason and puts the most frequent first', () => {
    const rows = [
      rating('Accuracy', 'Missed a lien'),
      rating('Accuracy', 'Wrong vesting'),
      rating('Accuracy', 'Wrong vesting'),
      rating(null, null),
    ]
    expect(reasonCounts(rows)).toEqual([
      ['Wrong vesting', 2],
      ['Missed a lien', 1],
    ])
  })

  it('reads the same whether handed every rating or only the ones that lost marks', () => {
    const rows = [rating('Accuracy', 'Wrong vesting'), rating(null, 'Looked fine'), rating(null, null)]
    expect(reasonCounts(rows)).toEqual(reasonCounts(rows.filter((x) => x.crit)))
    expect(reasonCounts(rows)).toEqual([['Wrong vesting', 1]])
  })
})

describe('the average of a set of ratings', () => {
  it('is the mean of their averages', () => {
    expect(qcAverage([{ avg: 4 }, { avg: 5 }])).toBe(4.5)
  })

  it('is null with nothing rated, and says so rather than printing a zero', () => {
    expect(qcAverage([])).toBeNull()
    expect(averageText(null)).toBe('—')
    expect(averageText(4.567)).toBe('4.57')
  })
})

describe('the reasons behind lost marks', () => {
  it('counts a note only where a mark was lost, so a comment on clean work is not a fault', () => {
    const base = { d: new Date(2026, 7, 3), order: 'A', cl: '', pr: '', stage: 'Search', on: 'us', onName: 'Uma Sankar', by: 'jr', byName: 'JP Ramesh', acc: 5, comp: 5, fmt: 5, avg: 5, defect: false }
    const rows: QcEntry[] = [
      { ...base, crit: 'Accuracy', note: 'Wrong parcel' },
      { ...base, crit: 'Accuracy', note: 'Wrong parcel' },
      { ...base, crit: null, note: 'Nice work' },
      { ...base, crit: null, note: null },
    ]
    expect(reasonCounts(rows)).toEqual([['Wrong parcel', 2]])
  })
})
