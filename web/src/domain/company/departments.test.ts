import { describe, expect, it } from 'vitest'
import { currentDepts, saveDept } from './departments'
import { saveStatus, statusName } from './statuses'
import { stageName } from './naming'
import { currentStaff } from '@/domain/people/roster'
import { allOrders, openExceptions, orderAsEdited, orderById } from '@/domain/orders/orders'
import { liveWork } from '@/domain/orders/liveWork'
import { dayLoadsOf } from '@/domain/orders/dayLoad'
import { must } from '../../../tests/must'

const ADMIN = { id: 'hw', r: 'admin' }
const search = () => must(currentDepts().find((d) => d.id === 'search'), 'the Search department')
const rename = (n: string) => saveDept(ADMIN, { ...search(), n }, 'search')
const members = (key: string) => currentStaff().filter((s) => s.dep.includes(key)).map((s) => s.id)
const held = (id: string) => orderAsEdited(must(orderById(id), id)).a

describe('renaming a department', () => {
  it('changes what it is called and leaves every piece of work where it was', () => {
    const exceptions = openExceptions().length
    const people = members('Search')
    const dept = must(liveWork().dwork.Search, 'the Search row')
    const loads = dayLoadsOf(currentStaff())
    const order = held('4193530-1')

    expect(rename('Abstracting')).toBeNull()

    expect(stageName('Search')).toBe('Abstracting')
    expect(statusName('search')).toBe('Abstracting')
    expect(search().n).toBe('Search')
    expect(openExceptions()).toHaveLength(exceptions)
    expect(members('Search')).toEqual(people)
    expect(liveWork().dwork.Search).toMatchObject({ tot: dept.tot, done: dept.done, unplaced: dept.unplaced })
    expect(liveWork().dwork.Search?.staff).toHaveLength(dept.staff.length)
    expect(dayLoadsOf(currentStaff())).toEqual(loads)
    expect(held('4193530-1')).toEqual(order)
    expect(currentDepts().find((d) => d.pair === 'Search')?.id).toBe('sqc')
  })

  it('refuses a name another department already shows, whichever way it got it', () => {
    rename('Abstracting')
    expect(saveDept(ADMIN, { n: 'abstracting', desc: '', auto: false, pair: null, qc: false })).toMatch(/already a department called/)
    expect(saveDept(ADMIN, { ...must(currentDepts().find((d) => d.id === 'typing'), 'Typing'), n: 'Abstracting' }, 'typing')).toMatch(/already/)
  })

  it('lets the old name go to a new department without taking the old one’s people', () => {
    rename('Abstracting')
    const people = members('Search')
    expect(saveDept(ADMIN, { n: 'Search', desc: '', auto: false, pair: null, qc: false })).toBeNull()
    const added = must(currentDepts().at(-1), 'the new department')
    expect(added.n).not.toBe('Search')
    expect(stageName(added.n)).toBe('Search')
    expect(members('Search')).toEqual(people)
    expect(members(added.n)).toEqual([])
  })
})

describe('renaming a status', () => {
  it('renames the stage an order is on while it is in that status, on every reader', () => {
    expect(saveStatus(ADMIN, 'Searching', '#3B82F6', 'search')).toBeNull()
    expect(stageName('Search')).toBe('Searching')
    expect(statusName('search')).toBe('Searching')
    expect(allOrders().filter((o) => o.stt === 'search').length).toBeGreaterThan(0)
  })
})
