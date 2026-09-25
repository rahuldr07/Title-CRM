import { describe, expect, it } from 'vitest'
import { allOrders } from './orders'
import { finishStage, setAssignee } from './orderWrites'
import { dayLoadOf, dayLoadsOf, teamLoad } from './dayLoad'
import { receivedOn } from './received'
import { board } from '@/domain/assignment/engine'
import { currentStaff, personById } from '@/domain/people/roster'
import { wouldSelfReview } from '@/domain/assignment/narrow'
import { curStageOf } from '@/domain/assignment/sla'
import { iso } from '@/shared/lib/format'
import { now } from '@/shared/lib/clock'
import { ASSIGN_STAGES } from '@/data/org'
import { must } from '../../../tests/must'

const CONFIRMED = { overTarget: true }

const LEAD = { id: 'sk', r: 'lead', n: 'Ashok S' }
const uma = () => must(personById('us'), 'Uma')

describe('a person’s load today', () => {
  it('agrees with what the assignment run counted, for everyone, before anything is changed', () => {
    const { run } = board()
    for (const s of currentStaff().filter((x) => x.dep.length)) {
      const day = dayLoadOf(s)
      expect(day.given).toBe(run.assigns.filter((a) => a.today && a.who === s.id).length)
      expect(day.load).toBe(run.load[s.id] ?? 0)
    }
  })

  it('is the work carried in plus the stages given today, and the room is what is left of the target', () => {
    const day = dayLoadOf(uma())
    expect(day.carried).toBe(uma().open)
    expect(day.load).toBe(day.carried + day.given)
    expect(day.given).toBe(day.done + day.onDesk)
    expect(day.room).toBe(Math.max(0, uma().cap - day.load))
  })

  it('counts a stage handed to them by hand on one of today’s orders', () => {
    const before = dayLoadOf(uma())
    const [o, stage] = must(
      receivedOn(allOrders(), iso(now()))
        .flatMap((x) => ASSIGN_STAGES.map((s) => [x, s] as const))
        .find(([x, s]) => x.a[s] !== 'us' && !wouldSelfReview(x.a, s, 'us') && !Object.values(x.a).includes('us')),
      'a stage on today’s orders Uma could take',
    )
    expect(setAssignee(LEAD, o.id, stage, 'us', CONFIRMED)).toBeNull()
    const after = dayLoadOf(uma())
    expect(after.given).toBe(before.given + 1)
    expect(after.load).toBe(before.load + 1)
  })

  it('moves a finished stage from their desk to done without changing what they were given', () => {
    const before = dayLoadOf(uma())
    const open = must(before.items.find((i) => !i.fin && curStageOf(i.o) === i.stage), 'the stage an order of Uma’s is waiting on')
    const r = finishStage({ id: 'us', r: 'staff', n: 'Uma Sankar' }, open.o.id)
    expect(r).toMatchObject({ done: true })
    const after = dayLoadOf(uma())
    expect(after.given).toBe(before.given)
    expect(after.done).toBe(before.done + 1)
    expect(after.onDesk).toBe(before.onDesk - 1)
  })
})

describe('the company-wide view of everyone’s load', () => {
  it('reads each person exactly as their own page does, after a stage is handed over by hand', () => {
    const [o, stage] = must(
      receivedOn(allOrders(), iso(now()))
        .flatMap((x) => ASSIGN_STAGES.map((s) => [x, s] as const))
        .find(([x, s]) => x.a[s] !== 'us' && !wouldSelfReview(x.a, s, 'us') && !Object.values(x.a).includes('us')),
      'a stage on today’s orders Uma could take',
    )
    const engineBefore = board().run.load.us
    expect(setAssignee(LEAD, o.id, stage, 'us', CONFIRMED)).toBeNull()
    const loads = dayLoadsOf(currentStaff())
    for (const s of currentStaff()) expect(loads[s.id]?.load).toBe(dayLoadOf(s).load)
    expect(loads.us?.load).toBe((engineBefore ?? 0) + 1)
  })

  it('adds up a team from the same per-person figures', () => {
    const team = currentStaff().filter((s) => s.dep.includes('Search'))
    const loads = dayLoadsOf(currentStaff())
    expect(teamLoad(loads, team)).toBe(team.reduce((a, s) => a + dayLoadOf(s).load, 0))
  })
})
