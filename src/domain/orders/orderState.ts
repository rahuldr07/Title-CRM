import { now } from '@/shared/lib/clock'
import { fmtDate, fmtTime, TZ } from '@/shared/lib/format'
import type { ChipKind } from '@/data/types'
import { hh } from '@/domain/assignment/sla'

export type DueKind = 'late' | 'soon' | 'ok'

export const SOON_HOURS = 4

export function dueMeta(d: Date, sent?: Date | null): { kind: DueKind; abs: string; rel: string } {
  const abs = `${fmtDate(d)} ${fmtTime(d)} ${TZ}`
  if (sent === null) return { kind: 'ok', abs, rel: 'delivered — no time on record' }
  if (sent) {
    const late = (sent.getTime() - d.getTime()) / 3600000
    return late > 0 ? { kind: 'late', abs, rel: `delivered ${hh(late)} late` } : { kind: 'ok', abs, rel: 'delivered on time' }
  }
  const diff = (d.getTime() - now().getTime()) / 3600000
  const kind: DueKind = diff < 0 ? 'late' : diff < SOON_HOURS ? 'soon' : 'ok'
  const rel =
    diff < 0
      ? `${Math.abs(Math.round(diff))}h overdue`
      : diff < 24
        ? `in ${Math.round(diff)}h`
        : `in ${Math.round(diff / 24)}d`
  return { kind, abs, rel }
}

export interface Dueable {
  due: Date
  done?: boolean
  sentAt?: Date
}

export const deliveryOf = (o: Dueable): Date | null | undefined => (o.done ? (o.sentAt ?? null) : undefined)

export type OrderState = 'done' | 'late' | 'soon' | 'open'

export function orderState(o: Dueable): OrderState {
  if (o.done) return 'done'
  const { kind } = dueMeta(o.due)
  return kind === 'ok' ? 'open' : kind
}

const ORDER_CHIP: Record<OrderState, ChipKind> = { done: 'v', late: 'd', soon: 'b', open: 'b' }

export const orderChipKind = (o: Dueable): ChipKind => ORDER_CHIP[orderState(o)]
