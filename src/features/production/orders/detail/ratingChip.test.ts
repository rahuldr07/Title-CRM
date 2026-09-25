import { describe, expect, it } from 'vitest'
import { ratingChip } from './ratingChip'

const rating = (acc: number, comp: number, fmt: number) => ({ who: 'us', scores: { acc, comp, fmt }, comment: '' })

describe('the chip on a rated person', () => {
  it('shows the average they were given, in its band', () => {
    expect(ratingChip(rating(5, 5, 4))).toEqual({ text: '4.7 · Excellent', kind: 'v' })
    expect(ratingChip(rating(4, 4, 4))).toEqual({ text: '4.0 · Room to improve', kind: 'r' })
    expect(ratingChip(rating(1, 2, 3))).toEqual({ text: '2.0 · Needs attention', kind: 'd' })
  })

  it('claims no score for someone rated before scores were kept', () => {
    expect(ratingChip(undefined)).toEqual({ text: 'Rated', kind: 'n' })
  })
})
