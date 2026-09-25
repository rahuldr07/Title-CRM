import { describe, expect, it } from 'vitest'
import { LEVEL_EDITOR, addLevel, currentLevels, personLevelOf, removeLevel, setCov, setPersonLevel } from './levels'
import { must } from '../../../tests/must'

const LEAD = { id: 'sk', r: 'lead' }
const STAFF = { id: 'us', r: 'staff' }

describe('who may change a level', () => {
  it('holds every level change to “assign”, the capability the Levels tab sits behind', () => {
    expect(LEVEL_EDITOR).toBe('assign')
    const level = must(currentLevels()[0], 'a level')
    const was = personLevelOf('sm')
    expect(setPersonLevel(STAFF, 'sm', '')).toMatch(/“assign”/)
    expect(personLevelOf('sm')).toBe(was)
    expect(setCov(STAFF, level.id, 'allstates')).toMatch(/“assign”/)
    expect(addLevel(STAFF).refused).toMatch(/“assign”/)
    expect(removeLevel(STAFF, level.id)).toMatchObject({ ok: false })
    expect(currentLevels()).toHaveLength(currentLevels().length)
  })

  it('lets someone holding “assign” move a person', () => {
    const level = must(currentLevels()[0], 'a level')
    expect(setPersonLevel(LEAD, 'sm', level.id)).toMatch(/→/)
    expect(personLevelOf('sm')).toBe(level.id)
  })
})
