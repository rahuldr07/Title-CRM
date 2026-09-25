import { afterEach, describe, expect, it } from 'vitest'
import { SEED_NOW, now, resetClock, setClock } from '@/shared/lib/clock'
import { SOON_HOURS, deliveryOf, dueMeta, orderChipKind, orderState, type OrderState } from './orderState'
import { allOrders, cameThroughIntake, orderAsEdited, orderById } from './orders'
import { setOrderField } from './orderWrites'
import { setQcRule } from '@/domain/quality/qcRules'
import { must } from '../../../tests/must'
import { ORDERS } from '@/data/production'
import type { Order } from '@/data/types'

afterEach(resetClock)

const at = (hoursFromNow: number, done = false): { due: Date; done?: boolean } => ({
  due: new Date(now().getTime() + hoursFromNow * 3600_000),
  done,
})

describe('the four states an order can be in', () => {
  it('calls a delivered order done, whatever its deadline says', () => {
    expect(orderState(at(-30, true))).toBe('done')
    expect(orderState(at(+30, true))).toBe('done')
  })

  it('calls an undelivered order past its deadline late', () => {
    expect(orderState(at(-0.5))).toBe('late')
  })

  it(`calls one due inside ${SOON_HOURS}h soon`, () => {
    expect(orderState(at(1))).toBe('soon')
    expect(orderState(at(SOON_HOURS - 0.01))).toBe('soon')
  })

  it('calls anything further out open', () => {
    expect(orderState(at(SOON_HOURS))).toBe('open')
    expect(orderState(at(72))).toBe('open')
  })

  it('puts the boundaries where the countdown puts them', () => {
    expect(orderState(at(0))).toBe('soon')
    expect(dueMeta(at(0).due).kind).toBe('soon')
    expect(dueMeta(at(SOON_HOURS).due).kind).toBe('ok')
  })
})

describe('the chip each state wears', () => {
  it('is green for delivered, red for late, blue for everything still running', () => {
    expect(orderChipKind(at(-30, true))).toBe('v')
    expect(orderChipKind(at(-0.5))).toBe('d')
    expect(orderChipKind(at(1))).toBe('b')
    expect(orderChipKind(at(72))).toBe('b')
  })

  it('gives the delivered-and-overdue order in the register the delivered chip', () => {
    const shipped = ORDERS.filter((o) => o.done && o.due < now())
    expect(shipped.length, 'the seed no longer contains a delivered, overdue order').toBeGreaterThan(0)
    shipped.forEach((o) => {
      expect(orderChipKind(o), `${o.id} is delivered but does not read as delivered`).toBe('v')
    })
  })

  it('is a case the dashboard’s old expression got wrong — which is why it is pinned', () => {
    const asDashboardHadIt = (o: Order) => (o.due < now() && !o.done ? 'd' : 'b')
    const shipped = ORDERS.filter((o) => o.done && o.due < now())

    shipped.forEach((o) => {
      expect(asDashboardHadIt(o), 'the counter-example no longer reproduces').toBe('b')
      expect(orderChipKind(o)).not.toBe(asDashboardHadIt(o))
    })
  })

  it('agrees with the old expression everywhere else, which is the part that was right', () => {
    const asDashboardHadIt = (o: Order) => (o.due < now() && !o.done ? 'd' : 'b')
    ORDERS.filter((o) => !o.done).forEach((o) => {
      expect(orderChipKind(o), `${o.id} changed colour and should not have`).toBe(asDashboardHadIt(o))
    })
  })
})

describe('the states as the register divides them', () => {
  it('gives every order exactly one of the four', () => {
    const states: OrderState[] = ['done', 'late', 'soon', 'open']
    const counted = states.reduce(
      (a, k) => a + ORDERS.filter((o) => orderState(o) === k).length,
      0,
    )
    expect(counted, 'an order fell into two pills or none').toBe(ORDERS.length)
  })

  it('moves with the clock rather than with a stored flag', () => {
    const order = ORDERS.find((o) => !o.done)!

    setClock(() => new Date(order.due.getTime() - 24 * 3600_000))
    expect(orderState(order)).toBe('open')

    setClock(() => new Date(order.due.getTime() - 1 * 3600_000))
    expect(orderState(order)).toBe('soon')

    setClock(() => new Date(order.due.getTime() + 1 * 3600_000))
    expect(orderState(order)).toBe('late')

    setClock(() => SEED_NOW)
  })
})

describe('the window is one constant', () => {
  it('is what both the state and the countdown read', () => {
    const justInside = at(SOON_HOURS - 0.01)
    const justOutside = at(SOON_HOURS + 0.01)

    expect(orderState(justInside)).toBe('soon')
    expect(dueMeta(justInside.due).kind).toBe('soon')
    expect(orderState(justOutside)).toBe('open')
    expect(dueMeta(justOutside.due).kind).toBe('ok')
  })
})

describe('a due date read against the clock', () => {
  it('moves every derived judgement with it', () => {
    const deadline = new Date(2026, 7, 3, 20, 0)

    setClock(() => new Date(2026, 7, 3, 17, 30))
    expect(dueMeta(deadline).kind, 'should be due soon, not late').toBe('soon')

    setClock(() => new Date(2026, 7, 3, 12, 0))
    expect(dueMeta(deadline).kind, 'eight hours out is neither late nor soon').toBe('ok')

    setClock(() => new Date(2026, 7, 4, 9, 0))
    expect(dueMeta(deadline).kind, 'the day after is late').toBe('late')
  })

  it('is what makes "late" derived rather than marked', () => {
    const due = new Date(2026, 7, 3, 16, 0)
    setClock(() => new Date(2026, 7, 3, 15, 0))
    expect(dueMeta(due).kind).not.toBe('late')
    setClock(() => new Date(2026, 7, 3, 17, 0))
    expect(dueMeta(due).kind).toBe('late')
  })
})

describe('the due line on a delivered order', () => {
  const due = new Date(2026, 7, 2, 12)

  it('measures a delivered order against when it was delivered, not against now', () => {
    expect(dueMeta(due, new Date(2026, 7, 2, 15))).toMatchObject({ kind: 'late', rel: 'delivered 3h late' })
    expect(dueMeta(due, new Date(2026, 7, 2, 9))).toMatchObject({ kind: 'ok', rel: 'delivered on time' })
    expect(dueMeta(due, null)).toMatchObject({ kind: 'ok', rel: 'delivered — no time on record' })
    expect(dueMeta(due).rel).toMatch(/overdue/)
  })

  it('never reads overdue on an order that has been sent, on any screen that lists orders', () => {
    const sent = allOrders().filter((o) => o.done)
    expect(sent.length).toBeGreaterThan(300)
    sent.forEach((o) => expect(dueMeta(o.due, deliveryOf(o)).rel, o.id).not.toMatch(/overdue/))
    expect(sent.filter((o) => deliveryOf(o)).every((o) => o.recv <= (deliveryOf(o) ?? o.recv))).toBe(true)
  })

  it('takes the time from the write that sent it', () => {
    const admin = { id: 'hw', r: 'admin', n: 'Harry Whitfield' }
    const o = must(allOrders().find((x) => !x.done && !cameThroughIntake(x)), 'a seeded order still open')
    expect(setQcRule(admin, 'mand', false)).toBeNull()
    expect(setOrderField(admin, o.id, 'stt', 'sent')).toBeNull()
    expect(deliveryOf(orderAsEdited(must(orderById(o.id), o.id)))).toEqual(now())
  })
})
