import type { Order } from '@/data/types'
import { allOrders, useOrders } from './orders'
import { orderState } from './orderState'

const openOrders = () => allOrders().filter((o) => !o.done)
export const pastDue = () => allOrders().filter((o) => orderState(o) === 'late')
const atRisk = () => allOrders().filter((o) => orderState(o) === 'soon')

export const pastDueCount = () => pastDue().length
export const usePastDueCount = (): number => useOrders().filter((o) => orderState(o) === 'late').length
export const atRiskCount = () => atRisk().length
export const openCount = () => openOrders().length

export function stageCounts(orders: readonly Pick<Order, 'stt'>[]): Record<string, number> {
  const c: Record<string, number> = {}
  orders.forEach((o) => {
    c[o.stt] = (c[o.stt] ?? 0) + 1
  })
  return c
}
