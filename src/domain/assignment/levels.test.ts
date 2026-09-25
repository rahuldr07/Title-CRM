import { must } from '../../../tests/must'
import { describe, expect, it } from 'vitest'
import {
  addCounty,
  addLevel,
  coversPlace,
  coversProduct,
  currentCoverage,
  currentLevels,
  personLevelOf,
  removeLevel,
  setCov,
  setCounty,
  setPersonLevel,
} from './levels'
import { board } from './engine'
import { narrowPool } from './narrow'
import { currentCounties } from '@/domain/counties/counties'
import { currentStaff } from '@/domain/people/roster'
import { LEVELS } from '@/data/org'

const LEAD = { id: 'sk', r: 'lead' }

const coverageHeld = () => board().run.exc.filter((e) => e.today && e.why === 'coverage')

const widenEveryLevel = () =>
  currentLevels().forEach((l) => {
    setCov(LEAD, l.id, 'allstates')
    setCov(LEAD, l.id, 'allproducts')
  })

describe('the engine reads coverage from the level book', () => {
  it('holds work for want of coverage once the levels cover no state', () => {
    expect(coverageHeld()).toEqual([])

    currentLevels().forEach((l) => setCov(LEAD, l.id, 'nostates'))

    expect(coverageHeld().length).toBeGreaterThan(0)
  })

  it('places the work a level held once that level is widened again', () => {
    currentLevels().forEach((l) => setCov(LEAD, l.id, 'nostates'))
    const held = coverageHeld()[0]
    if (!held) throw new Error('nothing is held for coverage')
    expect(narrowPool(held.o, held.stage).stop?.why).toBe('coverage')

    widenEveryLevel()

    expect(narrowPool(held.o, held.stage).stop?.why).not.toBe('coverage')
    expect(coverageHeld()).toEqual([])
  })

  it('stops covering a place the moment a level drops its states', () => {
    const lid = LEVELS[0]?.id
    const person = currentStaff().find((s) => personLevelOf(s.id) === lid)
    if (!lid || !person) throw new Error('nobody holds the first level')
    setCov(LEAD, lid, 'allstates')
    expect(coversPlace(person.id, 'PA', null)).toBe(true)

    setCov(LEAD, lid, 'nostates')

    expect(coversPlace(person.id, 'PA', null)).toBe(false)
  })

  it('narrows a state to the counties ticked, and no further', () => {
    const lid = LEVELS[0]?.id
    const person = currentStaff().find((s) => personLevelOf(s.id) === lid)
    const [a, b] = currentCounties().filter((c) => c.st === 'PA')
    if (!lid || !person || !a || !b) throw new Error('the seed has no two PA counties or no level holder')
    setCov(LEAD, lid, 'nostates')
    setCov(LEAD, lid, 'allproducts')
    setCov(LEAD, lid, 'state', 'PA')

    setCounty(LEAD, lid, 'PA', a.n)

    expect(coversPlace(person.id, 'PA', a.n)).toBe(false)
    expect(coversPlace(person.id, 'PA', b.n)).toBe(true)
  })

  it('follows a person to the level they are moved to', () => {
    const narrow = must(addLevel(LEAD).id, 'the new level')
    const person = currentStaff().find((s) => s.dep.length && personLevelOf(s.id))
    if (!person) throw new Error('nobody has a level')

    const msg = setPersonLevel(LEAD, person.id, narrow)

    expect(personLevelOf(person.id)).toBe(narrow)
    expect(coversProduct(person.id, 'FS')).toBe(false)
    expect(msg).toContain(person.n)
  })

  it('lets anyone with no level take anything', () => {
    const person = currentStaff().find((s) => personLevelOf(s.id))
    if (!person) throw new Error('nobody has a level')
    setPersonLevel(LEAD, person.id, '')
    expect(personLevelOf(person.id)).toBeNull()
    expect(coversPlace(person.id, 'ZZ', 'Nowhere')).toBe(true)
    expect(coversProduct(person.id, 'ANY')).toBe(true)
  })

  it('recomputes the shared board when coverage changes, and only then', () => {
    const first = board()
    expect(board()).toBe(first)

    widenEveryLevel()

    expect(board()).not.toBe(first)
  })
})

describe('the level book', () => {
  it('adds a county to the county list, not to a list of its own', () => {
    const before = currentCounties().length
    expect(addCounty(LEAD, 'PA', '  Testshire ')).toEqual({ ok: true })
    expect(currentCounties()).toHaveLength(before + 1)
    expect(currentCoverage().countiesIn('PA')).toContain('Testshire')
  })

  it('refuses a county already on file, and a blank one', () => {
    const on = currentCounties().find((c) => c.st === 'PA')
    if (!on) throw new Error('no PA county')
    expect(addCounty(LEAD, 'PA', on.n.toUpperCase()).ok).toBe(false)
    expect(addCounty(LEAD, 'PA', '   ').ok).toBe(false)
  })

  it('adds a level that covers nothing until told what', () => {
    const id = must(addLevel(LEAD).id, 'the new level')
    const l = currentLevels().find((x) => x.id === id)
    expect(l).toMatchObject({ states: [], products: [] })
    expect(currentCoverage().levelSentence(l!)).toMatch(/Covers nothing/)
  })

  it('will not remove a level somebody active holds', () => {
    const held = currentLevels().find((l) => currentCoverage().onLevel(l.id).length)
    if (!held) throw new Error('nobody holds a level')
    const r = removeLevel(LEAD, held.id)
    expect(r.ok).toBe(false)
    expect(currentLevels().some((l) => l.id === held.id)).toBe(true)
  })

  it('removes a level nobody holds', () => {
    const id = must(addLevel(LEAD).id, 'the new level')
    expect(removeLevel(LEAD, id)).toEqual({ ok: true })
    expect(currentLevels().some((l) => l.id === id)).toBe(false)
  })

  it('starts from the seed levels every test', () => {
    expect(currentLevels().map((l) => l.id)).toEqual(LEVELS.map((l) => l.id))
  })
})
