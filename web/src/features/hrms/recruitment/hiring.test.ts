import { describe, expect, it } from 'vitest'
import { addOpening, currentBoard, moveCandidate, openingProblem } from './hiring'
import { now } from '@/shared/lib/clock'
import { CANDIDATES, OPENINGS } from '@/data/hrms'
import { must } from '../../../../tests/must'

describe('the hiring board', () => {
  it('refuses a move from someone without “people”, and leaves the seed alone either way', () => {
    const c = must(CANDIDATES[0], 'a candidate')
    expect(moveCandidate({ id: 'sk', r: 'lead' }, c.id)).toMatch(/“people”/)
    expect(moveCandidate({ id: 'hw', r: 'admin' }, c.id)).toBeNull()
    expect(CANDIDATES[0]?.stage).toBe(c.stage)
  })

  const draft = { title: 'Searcher', dep: 'Search', n: 1, type: 'Full time', by: 'Uma Sankar', why: 'Backlog' }

  it('refuses a new opening from someone without “people”', () => {
    expect(addOpening({ id: 'us', r: 'staff' }, draft).refused).toMatch(/“people”/)
  })

  it('checks an opening at the write, whichever form sent it', () => {
    expect(openingProblem({ ...draft, title: ' ' })).toMatchObject({ field: 'title', message: expect.stringMatching(/title/) })
    expect(openingProblem({ ...draft, n: 0 })).toEqual({ field: 'seats', message: 'At least one seat.' })
    expect(openingProblem({ ...draft, n: 1.5 })?.field).toBe('seats')
    expect(openingProblem({ ...draft, n: 51 })?.message).toMatch(/typo/)
    expect(openingProblem({ ...draft, why: '' })).toMatchObject({ field: 'why' })
    expect(addOpening({ id: 'hw', r: 'admin' }, { ...draft, n: 0 })).toEqual({ id: null, refused: 'At least one seat.' })
  })

  it('gives a new opening the next id and today’s date', () => {
    const top = Math.max(...OPENINGS.map((o) => Number(o.id.replace(/\D/g, '')) || 0))
    const out = addOpening({ id: 'hw', r: 'admin' }, { ...draft, title: '  Searcher  ' })
    expect(out).toEqual({ id: `J${top + 1}`, refused: null })
    expect(currentBoard().openings[0]).toMatchObject({ id: `J${top + 1}`, title: 'Searcher', open: now() })
  })
})
