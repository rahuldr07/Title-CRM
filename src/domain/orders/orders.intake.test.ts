import { describe, expect, it } from 'vitest'
import { ASSIGN_STAGES, STAGES } from '@/data/org'
import type { Order } from '@/data/types'
import { now } from '@/shared/lib/clock'
import { previewAssign } from '@/domain/assignment/engine'
import { toggleRule } from '@/domain/assignment/rules'
import { addOrder, openExceptions, orderAsEdited, orderById, pipelineLoad, pipelineToday } from './orders'
import { setAssignee } from './orderWrites'
import { must } from '../../../tests/must'

const CONFIRMED = { overTarget: true }

const ADMIN = { id: 'hw', r: 'admin', n: 'Harry Whitfield' }

const draft = (id: string): Order => ({
  id,
  cl: 'MGR',
  pr: 'PRLP',
  stt: 'search',
  st: 'PA',
  co: 'Cambria',
  prop: '12 QA Lane, Johnstown',
  a: Object.fromEntries(STAGES.map((s) => [s, null])),
  due: new Date(now().getTime() + 24 * 36e5),
  recv: now(),
  fee: 29,
  age: 'just arrived',
})

const held = (id: string) => orderAsEdited(must(orderById(id), id)).a

describe('an order taken in on screen', () => {
  it('shows every stage the engine could not place as an exception, on every count of unassigned work', () => {
    const before = openExceptions().length
    const today = pipelineToday()
    expect(addOrder(ADMIN, draft('9000001-1'))).toBeNull()
    const open = ASSIGN_STAGES.filter((s) => !held('9000001-1')[s])
    const mine = openExceptions().filter((e) => e.o.id === '9000001-1')
    expect(open.length).toBeGreaterThan(0)
    expect(mine.map((e) => e.stage)).toEqual(open)
    mine.forEach((e) => expect(e.t, e.stage).toMatch(/\w/))
    expect(openExceptions()).toHaveLength(before + open.length)
    expect(pipelineToday().orders).toHaveLength(today.orders.length + 1)
    expect(pipelineToday().open).toBe(today.open + open.length)
  })

  it('stops being an exception once someone is given the stage', () => {
    addOrder(ADMIN, draft('9000001-1'))
    const first = must(openExceptions().find((e) => e.o.id === '9000001-1'), 'an open stage')
    expect(setAssignee(ADMIN, '9000001-1', first.stage, 'us', CONFIRMED)).toBeNull()
    expect(openExceptions().some((e) => e.o.id === '9000001-1' && e.stage === first.stage)).toBe(false)
  })

  it('is placed the way the preview said it would be, and counts against the next one’s load', () => {
    expect(toggleRule(ADMIN, 'r3')).toBeNull()
    const candidate = { pr: 'PRLP', st: 'PA', cl: 'MGR', co: 'Cambria' }
    const preview = previewAssign(candidate, pipelineLoad())
    expect(addOrder(ADMIN, draft('9000001-1'))).toBeNull()
    ASSIGN_STAGES.forEach((s) => expect(held('9000001-1')[s] ?? null, s).toBe(preview[s]?.who ?? null))
    const searcher = must(held('9000001-1').Search, 'a searcher')
    const load = pipelineLoad()
    expect(addOrder(ADMIN, draft('9000002-1'))).toBeNull()
    expect(pipelineLoad()[searcher]).toBeGreaterThanOrEqual((load[searcher] ?? 0) + (held('9000002-1').Search === searcher ? 1 : 0))
  })
})
