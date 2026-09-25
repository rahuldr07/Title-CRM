import { describe, expect, it } from 'vitest'
import { EVERYSTATE, covWord, levelMoves, makeCoverage, stateName } from './qualification'
import { COVSTAGES } from '@/data/org'
import { COUNTIES, PRODUCTS } from '@/data/catalog'
import { STAFF } from '@/data/people'
import type { Coverage, County, Level, Person } from '@/data/types'
import { must } from '../../../tests/must'

const county = (n: string, st: string): County => ({ n, st, idx: null, links: {} })
const COS = [county('Cambria', 'PA'), county('Luzerne', 'PA'), county('Fulton', 'GA')]

const lv = (over: Partial<Level>): Level => ({ id: 'l', n: 'L', note: '', states: 'all', counties: {}, products: 'all', ...over })

const person = (id: string, dep: string[] = [COVSTAGES[0] ?? 'Search']): Person => ({ ...must(STAFF[0], 'a seeded person'), id, n: id, dep, active: true })

describe('covWord', () => {
  it('says every state and product when unlimited', () => {
    expect(covWord({ states: 'all', products: 'all' })).toBe('every state · every product')
  })

  it('counts states, named counties and products, singular and plural', () => {
    const c: Coverage = { states: ['PA'], counties: { PA: ['Cambria'] }, products: ['COS', 'TOS'] }
    expect(covWord(c)).toBe('1 state (PA: 1 county) · 2 products')
    expect(covWord({ states: ['PA', 'GA'], counties: { PA: ['A', 'B'] }, products: ['COS'] })).toBe(
      '2 states (PA: 2 counties) · 1 product',
    )
  })
})

describe('stateName', () => {
  it('names a state by its code, and passes an unknown code through', () => {
    expect(stateName('PA')).toBe('Pennsylvania')
    expect(stateName('ZZ')).toBe('ZZ')
    expect(EVERYSTATE()).toContain('PA')
  })
})

describe('levelMoves', () => {
  it('lists only the people whose coverage reads differently now', () => {
    const narrow = lv({ n: 'Narrow', states: ['PA'], products: ['COS'] })
    const wide = lv({ n: 'Wide' })
    const prior: Record<string, Coverage> = {
      a: { states: ['PA'], products: ['COS'] },
      b: { states: ['PA'], products: ['COS'] },
    }
    const moves = levelMoves(prior, (id) => (id === 'a' ? narrow : wide), [
      { id: 'a', n: 'Ann' },
      { id: 'b', n: 'Ben' },
      { id: 'c', n: 'Cy' },
    ])
    expect(moves).toEqual([
      { id: 'b', n: 'Ben', before: '1 state · 1 product', after: 'every state · every product', lvl: 'Wide' },
    ])
  })

  it('skips someone with no level now', () => {
    expect(levelMoves({ a: { states: 'all', products: 'all' } }, () => null, [{ id: 'a', n: 'Ann' }])).toEqual([])
  })
})

describe('makeCoverage', () => {
  const levels = [
    lv({ id: 'n', n: 'Narrow', states: ['PA'], counties: { PA: ['Cambria'] }, products: ['COS'] }),
    lv({ id: 'w', n: 'Wide' }),
    lv({ id: 'z', n: 'Nothing', states: [], products: [] }),
  ]
  const staff = [person('a'), person('b'), person('c'), { ...person('d'), active: false }]
  const on: Record<string, string> = { a: 'n', b: 'w', d: 'n' }
  const cov = makeCoverage(levels, (id) => on[id] ?? null, COS, staff)

  it('covers a place only in a ticked state, and only the named counties there', () => {
    expect(cov.coversPlace('a', 'PA', 'Cambria')).toBe(true)
    expect(cov.coversPlace('a', 'PA', 'Luzerne')).toBe(false)
    expect(cov.coversPlace('a', 'PA', null)).toBe(true)
    expect(cov.coversPlace('a', 'GA', 'Fulton')).toBe(false)
  })

  it('covers a product only when ticked, or all of them', () => {
    expect(cov.coversProduct('a', 'COS')).toBe(true)
    expect(cov.coversProduct('a', 'TOS')).toBe(false)
    expect(cov.coversProduct('b', 'TOS')).toBe(true)
  })

  it('lets someone with no level take anything', () => {
    expect(cov.levelOf('c')).toBeNull()
    expect(cov.coversPlace('c', 'GA', 'Fulton')).toBe(true)
    expect(cov.coversProduct('c', 'ANY')).toBe(true)
  })

  it('lists the active people on a level', () => {
    expect(cov.onLevel('n').map((p) => p.id)).toEqual(['a'])
  })

  it('lists the states and counties on file', () => {
    expect(cov.allStates()).toEqual(['GA', 'PA'])
    expect(cov.countiesIn('PA')).toEqual(['Cambria', 'Luzerne'])
  })

  it('describes a level in a sentence', () => {
    expect(cov.levelSentence(must(levels[1], 'the second level'))).toBe('Every product — anywhere we work.')
    expect(cov.levelSentence(must(levels[0], 'the first level'))).toBe('COS — Cambria in PA.')
    expect(cov.levelSentence(must(levels[2], 'the third level'))).toMatch(/^Covers nothing/)
    expect(cov.levelSentence(lv({ states: [], products: ['COS'] }))).toMatch(/no states ticked/)
  })

  it('finds every place and product nobody in a stage covers', () => {
    const narrowOnly = makeCoverage(levels, () => 'n', COS, [person('a')])
    const gaps = narrowOnly.coverageGaps()
    const stage = COVSTAGES[0]
    expect(gaps).toContainEqual({ kind: 'place', stage, st: 'PA', co: 'Luzerne', near: ['a'] })
    expect(gaps).toContainEqual({ kind: 'place', stage, st: 'GA', co: 'Fulton', near: [] })
    expect(gaps.filter((g) => g.kind === 'product' && g.stage === stage)).toHaveLength(
      PRODUCTS.filter((p) => p.id !== 'COS').length,
    )
  })

  it('has no gaps when somebody in each stage covers everything', () => {
    const everyone = COVSTAGES.map((s, i) => person(`p${i}`, [s]))
    expect(makeCoverage(levels, () => 'w', COUNTIES, everyone).coverageGaps()).toEqual([])
  })
})
