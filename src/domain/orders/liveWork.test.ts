import { describe, expect, it } from 'vitest'
import { currentStaff } from '@/domain/people/roster'
import { toggleRule } from '@/domain/assignment/rules'
import { dayLoadsOf } from './dayLoad'
import { liveWork } from './liveWork'
import { orderAsEdited, orderById } from './orders'
import { setAssignee, targetBreach } from './orderWrites'
import { must } from '../../../tests/must'

const ADMIN = { id: 'hw', r: 'admin', n: 'Harry Whitfield' }
const ID = '4193530-1'
const held = () => orderAsEdited(must(orderById(ID), ID)).a

describe('the workload reports', () => {
  it('read the same live figures as a person’s day, for everyone', () => {
    const loads = dayLoadsOf(currentStaff())
    const { work } = liveWork()
    Object.values(work).forEach((r) => {
      const l = must(loads[r.s.id], r.s.id)
      expect({ done: r.done, pend: r.pend, tot: r.tot }, r.s.n).toEqual({ done: l.done, pend: l.onDesk, tot: l.given })
    })
  })

  it('move a stage from one person to another the moment it is reassigned by hand', () => {
    expect(held().Search).toBe('us')
    const before = liveWork()
    expect(setAssignee(ADMIN, ID, 'Search', 'sm', { overTarget: true })).toBeNull()
    const after = liveWork()
    expect(after.work.us?.tot).toBe((before.work.us?.tot ?? 0) - 1)
    expect(after.work.sm?.tot).toBe((before.work.sm?.tot ?? 0) + 1)
    expect(after.dwork.Search?.tot).toBe(before.dwork.Search?.tot)
    expect(after.dwork.Search?.people.sm).not.toEqual(before.dwork.Search?.people.sm)
    expect(after.work.sm?.items.some((i) => i.o.id === ID && i.stage === 'Search')).toBe(true)
  })
})

describe('giving someone a stage by hand', () => {
  it('stops at their daily target and says so, until the assigner confirms', () => {
    const sm = must(currentStaff().find((s) => s.id === 'sm'), 'Sathya')
    const load = must(dayLoadsOf([sm])[sm.id], 'Sathya’s day').load
    expect(load).toBeGreaterThanOrEqual(sm.cap)
    const why = targetBreach(ID, 'Search', 'sm')
    expect(why).toMatch(new RegExp(`Sathya Moorthy is at ${load} of a ${sm.cap} target`))
    expect(setAssignee(ADMIN, ID, 'Search', 'sm')).toBe(why)
    expect(held().Search).toBe('us')
    expect(setAssignee(ADMIN, ID, 'Search', 'sm', { overTarget: true })).toBeNull()
    expect(held().Search).toBe('sm')
  })

  it('does not ask when the person already holds the stage, or when the target rule is off', () => {
    expect(targetBreach(ID, 'Search', 'us')).toBeNull()
    expect(toggleRule(ADMIN, 'r3')).toBeNull()
    expect(targetBreach(ID, 'Search', 'sm')).toBeNull()
    expect(setAssignee(ADMIN, ID, 'Search', 'sm')).toBeNull()
  })
})
