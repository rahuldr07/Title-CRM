import { afterEach, describe, expect, it } from 'vitest'
import { addOrder, arrivalOrder, mayOpenOrder, orderLabel, ordersFor, ratingAverage, ratingComplete, ratingsOf, allOrders, nextOrderId, orderAsEdited, resetOrders, openExceptions, assigneeOn, placementOf, orderById, partiesOf, workingOn } from './orders'
import { addCost, addNote, finishStage, setAssignee, setOrderField } from './orderWrites'
import { markRated, ratedForSending } from './ratings'
import { setQcRule } from '@/domain/quality/qcRules'
import { ORDERS } from '@/data/production'
import { PRODUCTS } from '@/data/catalog'
import { curStageOf, slaHours } from '@/domain/assignment/sla'
import { SEED_NOW } from '@/shared/lib/clock'
import { board } from '@/domain/assignment/engine'
import { wouldSelfReview } from '@/domain/assignment/narrow'
import type { Order, OrderStatus } from '@/data/types'
import { must } from '../../../tests/must'

const CONFIRMED = { overTarget: true }

const as = (n: string) => ({ id: 'hw', r: 'admin', n })

afterEach(() => {
  resetOrders()
})

const seed = (i: number): Order => must(ORDERS[i], `seed order ${i}`)
const base = () => ORDERS.find((o) => o.cl === 'CSS' && o.pr === 'PRLP') ?? seed(0)

describe('editing an order', () => {
  it('leaves the seed register untouched', () => {
    const o = base()
    const before = { pr: o.pr, fee: o.fee, due: o.due.getTime(), a: { ...o.a } }

    setOrderField(as(''), o.id, 'pr', 'COS')
    setOrderField(as(''), o.id, 'bw', 'Somebody Else')
    setAssignee(as(''), o.id, 'Search', 'us', CONFIRMED)

    const after = must(ORDERS.find((x) => x.id === o.id), 'the seed order')
    expect({ pr: after.pr, fee: after.fee, due: after.due.getTime(), a: { ...after.a } }).toEqual(before)
  })

  it('lays the edits over the record when asked for it', () => {
    const o = base()
    setOrderField(as(''), o.id, 'bw', 'Somebody Else')
    expect(orderAsEdited(o).bw).toBe('Somebody Else')
    expect(orderAsEdited(o).id).toBe(o.id)
  })

  it('re-reads the promise when the product changes', () => {
    const o = base()
    expect(slaHours({ cl: o.cl, pr: 'PRLP' })).toBe(24)
    expect(slaHours({ cl: o.cl, pr: 'COS' })).toBe(48)

    setOrderField(as(''), o.id, 'pr', 'COS')
    const edited = orderAsEdited(o)

    expect(edited.due.getTime() - o.recv.getTime()).toBe(48 * 3600_000)
    expect(edited.fee).toBe(PRODUCTS.find((p) => p.id === 'COS')?.fee)
  })

  it('leaves the promise alone when the product does not change', () => {
    const o = base()
    setOrderField(as(''), o.id, 'bw', 'Anyone')
    expect(orderAsEdited(o).due.getTime()).toBe(o.due.getTime())
  })

  it('follows the stage into delivered', () => {
    const o = base()
    setQcRule(as(''), 'mand', false)
    expect(setOrderField(as(''), o.id, 'stt', 'sent')).toBeNull()
    expect(orderAsEdited(o).done).toBe(true)
    setOrderField(as(''), o.id, 'stt', 'typing')
    expect(orderAsEdited(o).done).toBe(false)
  })

  it('keeps the edits on one order off another', () => {
    const [a, b] = [seed(0), seed(1)]
    setOrderField(as(''), a.id, 'bw', 'Only On A')
    expect(orderAsEdited(b).bw).not.toBe('Only On A')
  })

  it('keeps costs and notes with the order they were added to', () => {
    const o = base()
    addCost(as('Tester'), o.id, 'Copy fee', 6.5)
    addNote(as('Tester'), o.id, 'Something worth knowing')
    expect(workingOn(o.id).costs).toHaveLength(1)
    expect(workingOn(o.id).notes[0]?.text).toBe('Something worth knowing')
    expect(workingOn(seed(1).id).costs).toHaveLength(0)
  })

  it('puts everything back on reset, so one test cannot leak into the next', () => {
    const o = base()
    setOrderField(as(''), o.id, 'pr', 'COS')
    addNote(as('Tester'), o.id, 'anything')
    resetOrders()
    expect(workingOn(o.id).notes).toHaveLength(0)
    expect(orderAsEdited(o).pr).toBe(o.pr)
  })
})

describe('reassigning one stage of an order from the run', () => {
  const fromRun = () => {
    const o = board().run.orders.find(
      (x) => !ORDERS.some((r) => r.id === x.id) && Object.values(x.plan ?? {}).filter(Boolean).length >= 2,
    )
    if (!o) throw new Error('the run has no order with two assigned stages')
    return o
  }

  it('finds the order the page shows', () => {
    const o = fromRun()
    expect(orderById(o.id)?.a).toEqual(o.plan)
  })

  it('keeps every other stage assigned', () => {
    const o = fromRun()
    const [first, ...others] = Object.keys(o.plan ?? {}).filter((k) => o.plan?.[k])
    const stage = must(first, 'an assigned stage')
    setAssignee(as(''), o.id, stage, 'us', CONFIRMED)

    const now = orderAsEdited(must(orderById(o.id), 'the order')).a
    expect(now[stage]).toBe('us')
    for (const s of others) expect(now[s]).toBe(o.plan?.[s])
  })
})

describe('the parties on an order', () => {
  const captured = (): Order => ({
    ...seed(0),
    id: 'T-1',
    buyer: 'John Doe',
    eff: '08/03/2026',
    parcel: '12-345-678',
  })

  it('shows what the order captured', () => {
    const p = partiesOf(captured())
    expect(p.borrower).toBe('John Doe')
    expect(p.effective).toBe('08/03/2026')
    expect(p.parcel).toBe('12-345-678')
  })

  it('shows nothing for a field the order never captured', () => {
    const p = partiesOf(seed(0))
    expect(p).toMatchObject({ borrower: '', effective: '', priorEffective: '', parcel: '', loanAmount: '' })
  })

  it('never shows one order’s parties on another', () => {
    const others = ORDERS.slice(0, 5).map((o) => partiesOf(o).borrower)
    expect(others.every((b) => b === '')).toBe(true)
  })

  it('lets an edit win over what was captured', () => {
    const o = captured()
    setOrderField(as(''), o.id, 'bw', 'Jane Doe')
    expect(partiesOf(o).borrower).toBe('Jane Doe')
  })

  it('builds the address from the property, county and state', () => {
    const o = seed(0)
    expect(partiesOf(o).address).toBe([o.prop, `${o.co} County`, o.st].filter(Boolean).join(', '))
  })
})

describe('the activity log', () => {
  const o = () => seed(0)
  const log = () => workingOn(o().id).events

  it('records a field edit with who and when', () => {
    setOrderField(as('Uma Sankar'), o().id, 'bw', 'John Doe')
    expect(log()).toEqual([
      { at: SEED_NOW, by: 'Uma Sankar', what: 'Borrower edited', detail: 'John Doe' },
    ])
  })

  it('keeps one entry for a run of keystrokes on one field', () => {
    for (const v of ['J', 'Jo', 'John']) setOrderField(as('Uma Sankar'), o().id, 'bw', v)
    expect(log()).toHaveLength(1)
    expect(log()[0]?.detail).toBe('John')
  })

  it('starts a new entry when the field changes', () => {
    setOrderField(as('Uma Sankar'), o().id, 'bw', 'John')
    setOrderField(as('Uma Sankar'), o().id, 'pi', '12-3')
    expect(log().map((e) => e.what)).toEqual(['Borrower edited', 'Parcel ID edited'])
  })

  it('records an assignment by the person’s name', () => {
    setAssignee(as('Ashok S'), o().id, 'Search', 'us', CONFIRMED)
    expect(log()[0]).toMatchObject({ by: 'Ashok S', what: 'Assigned · Search', detail: 'Uma Sankar' })
  })

  it('records a cost without its amount, which not everyone may see', () => {
    addCost(as('Uma Sankar'), o().id, 'County copy fee', 12.5)
    expect(log()[0]).toMatchObject({ what: 'Cost added', detail: 'County copy fee' })
    expect(JSON.stringify(log())).not.toMatch(/12\.5/)
  })

  it('does not print a loan amount either', () => {
    setOrderField(as('Harry Whitfield'), o().id, 'la', '250,000.00')
    expect(log()[0]).toMatchObject({ what: 'Loan amount edited', detail: '' })
  })

  it('records a stage change by the stage’s name', () => {
    setOrderField(as('Uma Sankar'), o().id, 'stt', 'tqc')
    expect(log()[0]).toMatchObject({ what: 'Stage edited', detail: 'Typing QC' })
  })
})

describe('every order, in one list', () => {
  const ids = () => allOrders().map((o) => o.id)

  it('holds each seed order and each order from the run, once', () => {
    const run = board().run.orders.map((o) => o.id)
    for (const id of [...ORDERS.map((o) => o.id), ...run]) expect(ids()).toContain(id)
    expect(new Set(ids()).size).toBe(ids().length)
  })

  it('shows the edits made on an order', () => {
    const o = seed(0)
    setAssignee(as(''), o.id, 'Search', 'us', CONFIRMED)
    expect(allOrders().find((x) => x.id === o.id)?.a.Search).toBe('us')
  })

  it('puts a new order first, without writing into the seed', () => {
    const before = ORDERS.length
    const made: Order = { ...seed(0), id: 'NEW-1', buyer: 'John Doe' }
    addOrder(as(''), made)
    expect(allOrders()[0]?.id).toBe('NEW-1')
    expect(orderById('NEW-1')?.buyer).toBe('John Doe')
    expect(ORDERS.length).toBe(before)
  })

  it('forgets new orders on reset', () => {
    addOrder(as(''), { ...seed(0), id: 'NEW-2' })
    resetOrders()
    expect(orderById('NEW-2')).toBeUndefined()
  })
})

describe('stages waiting on a person', () => {
  it('starts as the day’s exceptions from the run', () => {
    expect(openExceptions()).toHaveLength(board().run.exc.filter((e) => e.today).length)
  })

  it('drops a stage once somebody is assigned to it by hand', () => {
    const [first, ...rest] = openExceptions()
    if (!first) throw new Error('the run has no exceptions today')
    setAssignee(as('Ashok S'), first.o.id, first.stage, 'us', CONFIRMED)
    expect(openExceptions()).toHaveLength(rest.length)
    expect(orderById(first.o.id) && orderAsEdited(orderById(first.o.id)!).a[first.stage]).toBe('us')
  })
})

describe('what the day placed, counting hands', () => {
  it('starts as the run placed it', () => {
    const run = board().run
    expect(placementOf(run)).toEqual({
      placed: run.assigns.filter((a) => a.today).length,
      open: run.exc.filter((e) => e.today).length,
    })
  })

  it('moves one stage from open to placed when an exception is assigned by hand', () => {
    const before = placementOf(board().run)
    const [first] = openExceptions()
    if (!first) throw new Error('the run has no exceptions today')

    setAssignee(as('Ashok S'), first.o.id, first.stage, 'us', CONFIRMED)

    expect(placementOf(board().run)).toEqual({ placed: before.placed + 1, open: before.open - 1 })
    expect(placementOf(board().run).open).toBe(openExceptions().length)
  })

  it('names the person on a stage, whether the rules or a hand put them there', () => {
    const [first] = openExceptions()
    const placed = board().run.assigns.find((a) => a.today)
    if (!first || !placed) throw new Error('the run has nothing to test')
    expect(assigneeOn(first.o.id, first.stage)).toBeUndefined()
    expect(assigneeOn(placed.o.id, placed.stage)).toBe(placed.who)

    setAssignee(as('Ashok S'), first.o.id, first.stage, 'us', CONFIRMED)

    expect(assigneeOn(first.o.id, first.stage)).toBe('us')
  })
})

describe('self-review', () => {
  it('names the stage a QC pick would review', () => {
    expect(wouldSelfReview({ Search: 'us' }, 'Search QC', 'us')).toBe('Search')
    expect(wouldSelfReview({ Typing: 'ln' }, 'Typing QC', 'ln')).toBe('Typing')
  })

  it('allows anyone who did not do the paired stage', () => {
    expect(wouldSelfReview({ Search: 'us' }, 'Search QC', 'ln')).toBeNull()
  })

  it('does not apply to stages that check nothing', () => {
    expect(wouldSelfReview({ Search: 'us' }, 'Typing', 'us')).toBeNull()
  })
})

describe('rating the people on an order', () => {
  const o = () => {
    const found = ORDERS.find((x) => x.a.Search && x.a['Search QC'] && x.a.Typing && !x.a.RTS)
    if (!found) throw new Error('no seed order with three stages worked')
    return found
  }
  const full = (who: string, acc: number, comp: number, fmt: number, comment = '') => ({
    who,
    scores: { acc, comp, fmt },
    comment,
  })
  const all = () => ({
    Search: full(o().a.Search!, 5, 4, 3, 'Missed the second mortgage'),
    'Search QC': full(o().a['Search QC']!, 5, 5, 5),
    Typing: full(o().a.Typing!, 4, 4, 4),
  })

  it('keeps every score and comment entered, by stage', () => {
    expect(markRated(as('Keerthi B'), o().id, all())).toEqual({ ok: true })
    expect(ratedForSending(o().id)).toBe(true)
    expect(ratingsOf(o().id)).toMatchObject(all())
    expect(Object.values(ratingsOf(o().id)).every((r) => r.by === 'hw')).toBe(true)
  })

  it('logs the average the people were given', () => {
    markRated(as('Keerthi B'), o().id, all())
    expect(workingOn(o().id).events.at(-1)).toMatchObject({
      by: 'Keerthi B',
      what: 'QC rated',
      detail: 'Search, Search QC, Typing · average 4.3 across 3 people',
    })
  })

  it('refuses a rating that leaves a criterion unscored', () => {
    const r = markRated(as('Keerthi B'), o().id, { ...all(), Typing: { who: 'sk', scores: { acc: 4, comp: 4 }, comment: '' } })
    expect(r.ok).toBe(false)
    expect(ratedForSending(o().id)).toBe(false)
    expect(ratingsOf(o().id)).toEqual({})
  })

  it('keeps a rating that skips somebody, but the order is not rated until everyone who worked it is', () => {
    const { Typing: _skipped, ...some } = all()
    expect(markRated(as('Keerthi B'), o().id, some)).toEqual({ ok: true })
    expect(ratedForSending(o().id)).toBe(false)
  })

  it('refuses a score off the scale', () => {
    expect(markRated(as('Keerthi B'), o().id, { ...all(), Typing: full('sk', 4, 6, 4) }).ok).toBe(false)
  })

  it('is complete only when every criterion has a score on the scale', () => {
    expect(ratingComplete(undefined)).toBe(false)
    expect(ratingComplete({ who: 'x', scores: { acc: 5, comp: 5 }, comment: '' })).toBe(false)
    expect(ratingComplete(full('x', 1, 1, 1))).toBe(true)
  })

  it('averages the criteria of one rating', () => {
    expect(ratingAverage(full('x', 5, 4, 3))).toBe(4)
  })
})

describe('a new order’s number', () => {
  it('is one past the highest number on any order, in the same shape', () => {
    const top = Math.max(...allOrders().map((o) => Number(o.id.split('-')[0]) || 0))
    expect(nextOrderId()).toBe(`${top + 1}-1`)
  })

  it('is never one already taken', () => {
    const first = nextOrderId()
    addOrder(as(''), { ...seed(0), id: first })
    expect(nextOrderId()).not.toBe(first)
  })
})

describe('finishing a stage', () => {
  const at = (stt: OrderStatus) => {
    const o = seed(0)
    setQcRule(as(''), 'mand', false)
    setOrderField(as(''), o.id, 'stt', stt)
    setQcRule(as(''), 'mand', true)
    return o.id
  }
  const now = (id: string) => orderAsEdited(must(orderById(id), 'the order'))

  it('hands the order to the next stage', () => {
    const id = at('search')
    expect(finishStage(as('Uma Sankar'), id)).toMatchObject({ done: true, from: 'Search', to: 'Search QC' })
    expect(now(id).stt).toBe('sq')
  })

  it('records the handoff in the log', () => {
    const id = at('typing')
    finishStage(as('Uma Sankar'), id)
    expect(workingOn(id).events.at(-1)).toMatchObject({ by: 'Uma Sankar', what: 'Typing finished' })
  })

  it('sends the order after the last stage, where no rating is required', () => {
    const id = at('rts')
    setQcRule(as(''), 'mand', false)
    expect(finishStage(as('Tara R'), id)).toMatchObject({ done: true, from: 'RTS', to: 'Sent' })
    expect(now(id).done).toBe(true)
  })

  it('will not send an order nobody has rated, where rating is required', () => {
    const id = at('rts')
    setAssignee(as(''), id, 'Search', 'us', CONFIRMED)
    const refused = finishStage(as('Tara R'), id)
    expect(refused.done).toBe(false)
    expect(now(id).stt).toBe('rts')
    expect(markRated(as('Keerthi B'), id, { Search: { who: 'us', scores: { acc: 5, comp: 4, fmt: 5 }, comment: '' } }).ok).toBe(
      true,
    )
    expect(finishStage(as('Tara R'), id).done).toBe(true)
  })

  it('has nothing to finish on an order already sent', () => {
    const id = at('sent')
    expect(finishStage(as('Tara R'), id).done).toBe(false)
  })

  it('says why an order off the main line cannot be finished here', () => {
    const id = at('hold')
    const r = finishStage(as('Uma Sankar'), id)
    expect(r.done).toBe(false)
    if (!r.done) expect(r.why).toMatch(/hold/i)
  })
})

describe('the stage a run order is at', () => {
  const inSearch = () => {
    const a = board().run.today.find((x) => curStageOf(arrivalOrder(x)) === 'Search')
    expect(a, 'the seed run has an order still in Search').toBeDefined()
    return a!
  }

  it('is read from the order the rest of the app sees, so a finished stage moves the dashboard too', () => {
    const a = inSearch()
    const r = finishStage(as('rm'), a.id)
    expect(r.done).toBe(true)
    expect(curStageOf(arrivalOrder(a))).toBe('Search QC')
  })

  it('follows a status set by hand on the order', () => {
    const a = inSearch()
    setOrderField(as(''), a.id, 'stt', 'rts')
    expect(curStageOf(arrivalOrder(a))).toBe('RTS')
    setQcRule(as(''), 'mand', false)
    setOrderField(as(''), a.id, 'stt', 'sent')
    expect(curStageOf(arrivalOrder(a))).toBeNull()
  })
})

describe('the orders a person may open', () => {
  const staff = { id: 'us', r: 'staff' }

  it('are every order for someone who sees them all', () => {
    expect(ordersFor(as('Harry'), allOrders())).toHaveLength(allOrders().length)
  })

  it('are only the ones they are on for everyone else, the same set the Orders screen lists', () => {
    const mine = ordersFor(staff, allOrders())
    expect(mine.length).toBeGreaterThan(0)
    expect(mine.length).toBeLessThan(allOrders().length)
    expect(mine.every((o) => Object.values(o.a).includes('us'))).toBe(true)
    expect(allOrders().filter((o) => mayOpenOrder(staff, o))).toEqual(mine)
  })
})

describe('an order’s label in a picker', () => {
  it('leaves out what is not captured rather than printing a dangling separator', () => {
    const o = must(allOrders().find((x) => !x.prop), 'an order with no property')
    expect(orderLabel(o)).toBe(`${o.id} — ${o.pr}`)
    const seeded = must(ORDERS[1], 'a seeded order with a property')
    expect(orderLabel(seeded)).toBe(`${seeded.id} — ${seeded.pr} — ${seeded.prop}`)
  })
})
