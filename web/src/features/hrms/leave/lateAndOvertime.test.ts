import { describe, expect, it } from 'vitest'
import { lateSummary, overtimeSummary } from './lateAndOvertime'

describe('the leave policy', () => {
  it('counts late marks, the people behind them, the repeatedly late and the waived', () => {
    const mark = (who: string, waived = false) => ({ who, waived })
    const late = [mark('a'), mark('a'), mark('a'), mark('b'), mark('b', true), mark('c', true)]
    expect(lateSummary(late)).toEqual({ open: 4, people: 2, repeat: 1, waived: 2 })
    expect(lateSummary([])).toEqual({ open: 0, people: 0, repeat: 0, waived: 0 })
  })

  it('counts overtime claims that stand, those waiting and those approved', () => {
    const ot = ['pending', 'approved', 'rejected', 'approved'].map((st) => ({ st }))
    expect(overtimeSummary(ot)).toEqual({ claims: 3, pending: 1, approved: 2 })
  })
})
