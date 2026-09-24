import { afterEach, describe, expect, it } from 'vitest'
import {
  addCost,
  addNote,
  addOrder,
  finishStage,
  markRated,
  allOrders,
  nextOrderId,
  orderAsEdited,
  resetOrders,
  setAssignee,
  openExceptions,
  orderById,
  partiesOf,
  setOrderField,
  workingOn,
} from '@/state/orders'
import { addPrefix, clashOf, removePrefix, resetPrefixes } from '@/state/prefixes'
import { ORDERS } from '@/data/production'
import { PRODUCTS } from '@/data/catalog'
import { slaHours } from '@/lib/sla'
import { SEED_NOW } from '@/lib/clock'
import { board, wouldSelfReview } from '@/lib/engine'
import type { Order, OrderStatus } from '@/data/types'

/**
 * Editing an order, and claiming an order-number prefix.
 *
 * Both are held in module-level stores that six screens read, so two properties
 * matter beyond "does it write": the seed register must come out unchanged,
 * because every other screen reads it, and a product change must move the
 * promise with it, because the header, the checkpoints and the register would
 * otherwise quote three different deadlines for one order.
 */

afterEach(() => {
  resetOrders()
  resetPrefixes()
})

const base = () => ORDERS.find((o) => o.cl === 'CSS' && o.pr === 'PRLP') ?? ORDERS[0]

describe('editing an order', () => {
  it('leaves the seed register untouched', () => {
    const o = base()
    const before = { pr: o.pr, fee: o.fee, due: o.due.getTime(), a: { ...o.a } }

    setOrderField(o.id, 'pr', 'COS')
    setOrderField(o.id, 'bw', 'Somebody Else')
    setAssignee(o.id, 'Search', 'us')

    const after = ORDERS.find((x) => x.id === o.id)!
    expect({ pr: after.pr, fee: after.fee, due: after.due.getTime(), a: { ...after.a } }).toEqual(before)
  })

  it('lays the edits over the record when asked for it', () => {
    const o = base()
    setOrderField(o.id, 'bw', 'Somebody Else')
    expect(orderAsEdited(o).bw).toBe('Somebody Else')
    expect(orderAsEdited(o).id).toBe(o.id)
  })

  /*
   * The one rule on this screen that moves more than the field it is on. CSS
   * promises 48 hours for a COS and 24 for everything else, so changing the
   * product has to re-read the SLA — otherwise the due date shown is the promise
   * for a product this order no longer is.
   */
  it('re-reads the promise when the product changes', () => {
    const o = base()
    expect(slaHours({ cl: o.cl, pr: 'PRLP' })).toBe(24)
    expect(slaHours({ cl: o.cl, pr: 'COS' })).toBe(48)

    setOrderField(o.id, 'pr', 'COS')
    const edited = orderAsEdited(o)

    expect(edited.due.getTime() - o.recv.getTime()).toBe(48 * 3600_000)
    expect(edited.fee).toBe(PRODUCTS.find((p) => p.id === 'COS')!.fee)
  })

  it('leaves the promise alone when the product does not change', () => {
    const o = base()
    setOrderField(o.id, 'bw', 'Anyone')
    expect(orderAsEdited(o).due.getTime()).toBe(o.due.getTime())
  })

  /* Marking an order Sent is what "done" means, and several counts read it. */
  it('follows the stage into delivered', () => {
    const o = base()
    setOrderField(o.id, 'stt', 'sent')
    expect(orderAsEdited(o).done).toBe(true)
    setOrderField(o.id, 'stt', 'typing')
    expect(orderAsEdited(o).done).toBe(false)
  })

  it('keeps the edits on one order off another', () => {
    const [a, b] = ORDERS
    setOrderField(a.id, 'bw', 'Only On A')
    expect(orderAsEdited(b).bw).not.toBe('Only On A')
  })

  it('keeps costs and notes with the order they were added to', () => {
    const o = base()
    addCost(o.id, 'Copy fee', 6.5, 'Tester')
    addNote(o.id, 'Something worth knowing', 'Tester')
    expect(workingOn(o.id).costs).toHaveLength(1)
    expect(workingOn(o.id).notes[0].text).toBe('Something worth knowing')
    expect(workingOn(ORDERS[1].id).costs).toHaveLength(0)
  })

  it('puts everything back on reset, so one test cannot leak into the next', () => {
    const o = base()
    setOrderField(o.id, 'pr', 'COS')
    addNote(o.id, 'anything', 'Tester')
    resetOrders()
    expect(workingOn(o.id).notes).toHaveLength(0)
    expect(orderAsEdited(o).pr).toBe(o.pr)
  })
})

describe('claiming an order-number prefix', () => {
  it('refuses one that is already claimed', () => {
    expect(clashOf('MGRMI-')).not.toBeNull()
  })

  /*
   * Collision is not equality. An order number matching the longer prefix also
   * matches the shorter, so whichever is checked first decides — which is not a
   * decision anybody made.
   */
  it('refuses one that merely overlaps, in either direction', () => {
    expect(clashOf('MGRMI'), 'shorter than an existing one').not.toBeNull()
    expect(clashOf('MGRMI-2024'), 'longer than an existing one').not.toBeNull()
  })

  it('allows one that shares no leading run', () => {
    expect(clashOf('ZZTOP-')).toBeNull()
  })

  /* The check has to see every client, not only the ones somebody has opened —
     that was the bug in the original: prefixes were materialised on view. */
  it('sees clients nobody has opened', () => {
    expect(clashOf('MJPA-')).not.toBeNull()
    expect(clashOf('NTCFL-')).not.toBeNull()
  })

  it('adds and removes', () => {
    expect(clashOf('ZZTOP-')).toBeNull()
    addPrefix('MGR', 'ZZTOP-')
    expect(clashOf('ZZTOP-')).toEqual(['MGR', 'ZZTOP-'])
    removePrefix('MGR', 'ZZTOP-')
    expect(clashOf('ZZTOP-')).toBeNull()
  })

  it('puts the seed back on reset', () => {
    addPrefix('MGR', 'ZZTOP-')
    resetPrefixes()
    expect(clashOf('ZZTOP-')).toBeNull()
  })
})

/*
 * Most of today's orders exist only in the assignment run, not in the seed
 * register. The order page shows their assignments from the run, so a change to
 * one stage has to start from those — starting from nothing unassigns every
 * other stage on the order, which the review reproduced on 4193532-1.
 */
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
    const [stage, ...others] = Object.keys(o.plan ?? {}).filter((k) => o.plan?.[k])
    setAssignee(o.id, stage, 'us')

    const now = orderAsEdited(orderById(o.id)!).a
    expect(now[stage]).toBe('us')
    for (const s of others) expect(now[s]).toBe(o.plan?.[s])
  })
})

/*
 * The parties on an order are that order's, or nothing.
 *
 * The order page filled every blank field with one sample order's values — the
 * borrower "Sara Bahorik", a loan of 64,804.00, dates counted back from today —
 * so a new order for John Doe opened showing Sara Bahorik. In title work that
 * is the error the product exists to prevent. A field the order never captured
 * is shown empty, and a field it did capture is shown as captured.
 */
describe('the parties on an order', () => {
  const captured = (): Order => ({
    ...ORDERS[0],
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
    const p = partiesOf(ORDERS[0])
    expect(p).toMatchObject({ borrower: '', effective: '', priorEffective: '', parcel: '', loanAmount: '' })
  })

  it('never shows one order’s parties on another', () => {
    const others = ORDERS.slice(0, 5).map((o) => partiesOf(o).borrower)
    expect(others.every((b) => b === '')).toBe(true)
  })

  it('lets an edit win over what was captured', () => {
    const o = captured()
    setOrderField(o.id, 'bw', 'Jane Doe')
    expect(partiesOf(o).borrower).toBe('Jane Doe')
  })

  it('builds the address from the property, county and state', () => {
    const o = ORDERS[0]
    expect(partiesOf(o).address).toBe([o.prop, `${o.co} County`, o.st].filter(Boolean).join(', '))
  })
})

/*
 * The order's activity log records what happened to it, with who and when.
 *
 * The page promises "every create, status change, assignment, field edit, QC
 * rating and delivery is recorded with who and when" and then showed the same
 * five invented entries on every order. The log is what the store saw.
 */
describe('the activity log', () => {
  const o = () => ORDERS[0]
  const log = () => workingOn(o().id).events

  it('records a field edit with who and when', () => {
    setOrderField(o().id, 'bw', 'John Doe', 'Uma Sankar')
    expect(log()).toEqual([
      { at: SEED_NOW, by: 'Uma Sankar', what: 'Borrower edited', detail: 'John Doe' },
    ])
  })

  it('keeps one entry for a run of keystrokes on one field', () => {
    for (const v of ['J', 'Jo', 'John']) setOrderField(o().id, 'bw', v, 'Uma Sankar')
    expect(log()).toHaveLength(1)
    expect(log()[0]?.detail).toBe('John')
  })

  it('starts a new entry when the field changes', () => {
    setOrderField(o().id, 'bw', 'John', 'Uma Sankar')
    setOrderField(o().id, 'pi', '12-3', 'Uma Sankar')
    expect(log().map((e) => e.what)).toEqual(['Borrower edited', 'Parcel ID edited'])
  })

  it('records an assignment by the person’s name', () => {
    setAssignee(o().id, 'Search', 'us', 'Ashok S')
    expect(log()[0]).toMatchObject({ by: 'Ashok S', what: 'Assigned · Search', detail: 'Uma Sankar' })
  })

  it('records a cost without its amount, which not everyone may see', () => {
    addCost(o().id, 'County copy fee', 12.5, 'Uma Sankar')
    expect(log()[0]).toMatchObject({ what: 'Cost added', detail: 'County copy fee' })
    expect(JSON.stringify(log())).not.toMatch(/12\.5/)
  })

  it('does not print a loan amount either', () => {
    setOrderField(o().id, 'la', '250,000.00', 'Harry Whitfield')
    expect(log()[0]).toMatchObject({ what: 'Loan amount edited', detail: '' })
  })

  it('records a stage change by the stage’s name', () => {
    setOrderField(o().id, 'stt', 'tqc', 'Uma Sankar')
    expect(log()[0]).toMatchObject({ what: 'Stage edited', detail: 'Typing QC' })
  })
})

/*
 * One list of orders, which every screen reads.
 *
 * The register and the dashboard read the eight seed orders; assignment and the
 * reports read the ninety in today's run. So the dashboard said one stage was
 * unassigned while assignment said seventeen, and an order from the run opened
 * by its link but could not be found by searching the register.
 */
describe('every order, in one list', () => {
  const ids = () => allOrders().map((o) => o.id)

  it('holds each seed order and each order from the run, once', () => {
    const run = board().run.orders.map((o) => o.id)
    for (const id of [...ORDERS.map((o) => o.id), ...run]) expect(ids()).toContain(id)
    expect(new Set(ids()).size).toBe(ids().length)
  })

  it('shows the edits made on an order', () => {
    const o = ORDERS[0]
    setAssignee(o.id, 'Search', 'us')
    expect(allOrders().find((x) => x.id === o.id)?.a.Search).toBe('us')
  })

  it('puts a new order first, without writing into the seed', () => {
    const before = ORDERS.length
    const made: Order = { ...ORDERS[0], id: 'NEW-1', buyer: 'John Doe' }
    addOrder(made)
    expect(allOrders()[0]?.id).toBe('NEW-1')
    expect(orderById('NEW-1')?.buyer).toBe('John Doe')
    expect(ORDERS.length).toBe(before)
  })

  it('forgets new orders on reset', () => {
    addOrder({ ...ORDERS[0], id: 'NEW-2' })
    resetOrders()
    expect(orderById('NEW-2')).toBeUndefined()
  })
})

/*
 * Stages waiting on a person, counted one way everywhere.
 *
 * Assignment said seventeen, the dashboard said one, and assigning an exception
 * by hand lowered neither — the pick lived in the tab's own state and never
 * reached the order. The count is the day's unplaced stages that the order still
 * has nobody on, so a hand assignment takes one off it wherever it is read.
 */
describe('stages waiting on a person', () => {
  it('starts as the day’s exceptions from the run', () => {
    expect(openExceptions()).toHaveLength(board().run.exc.filter((e) => e.today).length)
  })

  it('drops a stage once somebody is assigned to it by hand', () => {
    const [first, ...rest] = openExceptions()
    if (!first) throw new Error('the run has no exceptions today')
    setAssignee(first.o.id, first.stage, 'us', 'Ashok S')
    expect(openExceptions()).toHaveLength(rest.length)
    expect(orderById(first.o.id) && orderAsEdited(orderById(first.o.id)!).a[first.stage]).toBe('us')
  })
})

/*
 * Self-review is structural (PRODUCT.md): a QC stage never goes to the author of
 * the stage it checks. The engine, the order page and the exceptions tab each
 * wrote the check out; they read this one now.
 */
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

describe('a new order’s number', () => {
  it('is one past the highest number on any order, in the same shape', () => {
    const top = Math.max(...allOrders().map((o) => Number(o.id.split('-')[0]) || 0))
    expect(nextOrderId()).toBe(`${top + 1}-1`)
  })

  it('is never one already taken', () => {
    const first = nextOrderId()
    addOrder({ ...ORDERS[0], id: first })
    expect(nextOrderId()).not.toBe(first)
  })
})

/*
 * Finishing a stage is the one action a production seat takes all day, and it had
 * no button: handing off meant changing a dropdown and pressing Save. It moves
 * the order to the next stage, says who it went to, and — where the rating rule
 * is on — will not send an order nobody has rated.
 */
describe('finishing a stage', () => {
  const at = (stt: OrderStatus) => {
    const o = ORDERS[0]
    setOrderField(o.id, 'stt', stt)
    return o.id
  }
  const now = (id: string) => orderAsEdited(orderById(id)!)

  it('hands the order to the next stage', () => {
    const id = at('search')
    expect(finishStage(id, 'Uma Sankar')).toMatchObject({ done: true, from: 'Search', to: 'Search QC' })
    expect(now(id).stt).toBe('sq')
  })

  it('records the handoff in the log', () => {
    const id = at('typing')
    finishStage(id, 'Uma Sankar')
    expect(workingOn(id).events.at(-1)).toMatchObject({ by: 'Uma Sankar', what: 'Typing finished' })
  })

  it('sends the order after the last stage', () => {
    const id = at('rts')
    expect(finishStage(id, 'Tara R')).toMatchObject({ done: true, from: 'RTS', to: 'Sent' })
    expect(now(id).done).toBe(true)
  })

  it('will not send an order nobody has rated, where rating is required', () => {
    const id = at('rts')
    const refused = finishStage(id, 'Tara R', true)
    expect(refused.done).toBe(false)
    expect(now(id).stt).toBe('rts')
    markRated(id, 'Keerthi B')
    expect(finishStage(id, 'Tara R', true).done).toBe(true)
  })

  it('has nothing to finish on an order already sent', () => {
    const id = at('sent')
    expect(finishStage(id, 'Tara R').done).toBe(false)
  })

  it('says why an order off the main line cannot be finished here', () => {
    const id = at('hold')
    const r = finishStage(id, 'Uma Sankar')
    expect(r.done).toBe(false)
    if (!r.done) expect(r.why).toMatch(/hold/i)
  })
})
