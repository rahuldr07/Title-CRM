import { describe, expect, it } from 'vitest'
import { RULES } from '@/data/org'
import { orderPlan } from '@/domain/assignment/sla'
import { orderAsEdited, orderById, workingOn, type StageRating } from '@/domain/orders/orders'
import { setOrderField } from '@/domain/orders/orderWrites'
import { currentSla } from '@/domain/assignment/turnaround'
import { board } from '@/domain/assignment/engine'
import { currentStaff, saveStaff } from '@/domain/people/roster'
import { statusName } from '@/domain/company/statuses'
import { newPerson } from '@/domain/people/people'
import { must } from '../../../../../tests/must'
import { costTotalOf, isStatus, historyRows, planAssignAll, withScore } from './orderDetail'

const ADMIN = { id: 'hw', r: 'admin', n: 'Harry Whitfield' }
const order = () => orderAsEdited(orderById('4192254-2')!)

describe('an order status', () => {
  it('reads as its label, or as itself when unknown', () => {
    expect(statusName('search')).toBe('Search')
    expect(statusName('zzz')).toBe('zzz')
  })

  it('is recognised only when it is one of the statuses', () => {
    expect(isStatus('search')).toBe(true)
    expect(isStatus('toString')).toBe(false)
  })
})

describe('the pass-through cost total', () => {
  it('sums to the cent without float drift', () => {
    expect(costTotalOf([{ amt: 0.1 }, { amt: 0.2 }])).toBe(0.3)
  })

  it('is zero with nothing paid out', () => {
    expect(costTotalOf([])).toBe(0)
  })
})


describe('scoring a stage', () => {
  const r: StageRating = { who: 'us', scores: { acc: 4 }, comment: 'x' }

  it('sets a criterion and keeps the others', () => {
    expect(withScore(r, 'comp', 5).scores).toEqual({ acc: 4, comp: 5 })
  })

  it('clears a criterion scored back to nothing', () => {
    expect(withScore(r, 'acc', 0)).toEqual({ who: 'us', scores: {}, comment: 'x' })
  })
})

describe('the activity log', () => {
  it('opens with the receipt and the SLA that set the due date', () => {
    expect(historyRows(must(orderById(order().id), 'the order'), []).map((r) => r.slice(1))).toEqual([
      ['Order received', 'system', 'MGR · LIEN'],
      ['Due date set', 'system', 'SLA MGR × LIEN = 24h → 08/03/2026 11:30 AM ET'],
    ])
  })

  it('names a dash for an event nobody signed', () => {
    const at = new Date(2026, 7, 3, 10)
    const rows = historyRows(must(orderById(order().id), 'the order'), [{ at, by: '', what: 'Edited', detail: 'd' }])
    expect(rows[2]).toEqual([at, 'Edited', '—', 'd'])
  })

  it('keeps what happened when it happened, after the product is changed', () => {
    const id = order().id
    const before = historyRows(must(orderById(id), 'the order'), []).map((r) => r.slice(1))
    expect(setOrderField(ADMIN, id, 'pr', 'FS+')).toBeNull()
    const rows = historyRows(must(orderById(id), 'the order'), workingOn(id).events).map((r) => r.slice(1))
    expect(rows.slice(0, 2)).toEqual(before)
    expect(rows[2]).toEqual(['Product edited', 'Harry Whitfield', 'LIEN → FS+ · SLA —  (default) × Any = 24h → due 08/03/2026 11:30 AM ET'])
    expect(setOrderField(ADMIN, id, 'pr', 'PRLP')).toBeNull()
    const again = historyRows(must(orderById(id), 'the order'), workingOn(id).events).map((r) => r.slice(1))
    expect(again[2]).toEqual(rows[2])
    expect(again[3]?.[2]).toBe('FS+ → PRLP · SLA MGR × PRLP = 24h → due 08/03/2026 11:30 AM ET')
  })
})

describe('the SLA after a product change', () => {
  it('is re-read for the new product, and falls to the default only where the client has no rule for it', () => {
    const id = order().id
    const edited = () => orderAsEdited(must(orderById(id), 'the order'))
    setOrderField(ADMIN, id, 'pr', 'PRLP')
    expect(orderPlan(edited()).rule).toMatchObject({ cl: 'MGR', pr: 'PRLP' })
    setOrderField(ADMIN, id, 'pr', 'FS+')
    expect(currentSla().some((r) => r.cl === 'MGR' && (r.pr === 'FS+' || r.pr === 'Any'))).toBe(false)
    expect(orderPlan(edited()).rule).toMatchObject({ pr: 'Any', h: 24 })
  })
})


describe('assigning the remaining stages', () => {
  it('fills every open stage the automatic pass can place, naming the rules it consulted', () => {
    const o = order()
    const blank = Object.fromEntries(Object.keys(o.a).map((k) => [k, null]))
    const p = planAssignAll(o, blank, RULES)
    expect(p.open).toEqual(['Search', 'Search QC', 'Typing', 'Typing QC', 'RTS'])
    expect(p.preview.map((x) => [x.stage, x.person?.id])).toEqual([
      ['Search', 'us'],
      ['Search QC', 'jr'],
      ['Typing', 'sk'],
      ['Typing QC', 'md'],
      ['RTS', 'gk'],
    ])
    expect(p.taken).toEqual({ ...blank, Search: 'us', 'Search QC': 'jr', Typing: 'sk', 'Typing QC': 'md', RTS: 'gk' })
    expect(p.applied).toEqual([
      'Department membership',
      'Availability',
      'Self-review',
      'LIEN typing group',
      'State and county coverage',
      'Product coverage',
      'Fill the emptiest first',
    ])
  })

  it('counts a person picked for one stage toward the next', () => {
    const o = order()
    saveStaff({ id: 'hw', r: 'admin' }, { ...newPerson(), n: 'Two Desks', e: 'two.desks@keystoneabstract.com', dep: ['Search', 'RTS'], cap: 1 })
    const both = currentStaff().at(-1)!.id
    const blank = Object.fromEntries(Object.keys(o.a).map((k) => [k, null]))
    const load = { ...board().run.load, [both]: 0 }
    const picks = planAssignAll(o, blank, RULES, load).preview.map((x) => [x.stage, x.person?.id])
    expect(picks).toContainEqual(['Search', both])
    expect(picks).toContainEqual(['RTS', 'gk'])
  })

  it('leaves nothing open when every stage has an owner', () => {
    const o = order()
    const full = { Search: 'us', 'Search QC': 'jr', Typing: 'sk', 'Typing QC': 'md', RTS: 'gk' }
    expect(planAssignAll(o, full, RULES).open).toEqual([])
  })
})
