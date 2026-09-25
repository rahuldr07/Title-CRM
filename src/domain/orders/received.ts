import { board } from '@/domain/assignment/engine'
import { iso } from '@/shared/lib/format'
import { cameThroughIntake, type EditedOrder } from './orders'

export const receivedOn = (orders: readonly EditedOrder[], dk: string): EditedOrder[] =>
  orders.filter((o) => cameThroughIntake(o) && (dk === 'all' || iso(o.recv) === dk))

export const receivedDays = (orders: readonly EditedOrder[]): { dk: string; date: Date; n: number }[] =>
  board().run.days.map((d) => {
    const dk = iso(d.date)
    return { dk, date: d.date, n: receivedOn(orders, dk).length }
  })
