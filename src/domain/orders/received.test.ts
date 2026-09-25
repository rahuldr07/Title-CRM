import { describe, expect, it } from 'vitest'
import { addOrder, allOrders } from './orders'
import { receivedDays, receivedOn } from './received'
import { board } from '@/domain/assignment/engine'
import { ORDERS } from '@/data/production'
import { applyDateFormat, iso } from '@/shared/lib/format'
import { now } from '@/shared/lib/clock'
import { must } from '../../../tests/must'

const ADMIN = { id: 'hw', r: 'admin', n: 'Harry Whitfield' }
const today = () => iso(now())

describe('the orders received on a day', () => {
  it('are the day’s arrivals, the design’s own figures, read through the orders', () => {
    const { run } = board()
    expect(receivedOn(allOrders(), today()).map((o) => o.id)).toEqual(run.today.map((o) => o.id))
    for (const d of run.days) expect(receivedOn(allOrders(), d.dk)).toHaveLength(d.n)
    expect(receivedOn(allOrders(), 'all')).toHaveLength(run.orders.length)
  })

  it('include an order taken in on screen today', () => {
    const before = receivedOn(allOrders(), today()).length
    const seed = must(ORDERS[0], 'a seed order')
    expect(addOrder(ADMIN, { ...seed, id: '4199999-1', recv: now() })).toBeNull()
    const after = receivedOn(allOrders(), today())
    expect(after).toHaveLength(before + 1)
    expect(after.some((o) => o.id === '4199999-1')).toBe(true)
    expect(receivedDays(allOrders()).find((d) => d.dk === today())?.n).toBe(before + 1)
  })

  it('are keyed by the day itself, so a board worked out before the company switched date format still matches', () => {
    const { run } = board()
    applyDateFormat('DD/MM/YYYY')
    for (const d of run.days) expect(receivedOn(allOrders(), d.dk)).toHaveLength(d.n)
    expect(receivedDays(allOrders()).map((d) => d.dk)).toEqual(run.days.map((d) => d.dk))
  })

  it('leave out the seed’s worked examples, which carry no intake record', () => {
    const seeded = new Set(ORDERS.map((o) => o.id))
    expect(receivedOn(allOrders(), 'all').some((o) => seeded.has(o.id))).toBe(false)
  })
})
