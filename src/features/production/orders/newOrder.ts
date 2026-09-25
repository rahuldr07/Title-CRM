import { STAGES } from '@/data/org'
import type { Order } from '@/data/types'
import { currentClients } from '@/domain/company/clients'
import { now } from '@/shared/lib/clock'
import { fmtDate } from '@/shared/lib/format'
import type { Draft } from './fromMail'

export const blankOrder = (): Draft => ({
  addr: '',
  county: '',
  st: 'PA',
  parcel: '',
  client: currentClients().filter((c) => c.active !== false)[0]?.n ?? '',
  product: 'PRLP',
  ref: '',
  eff: fmtDate(now()),
  buyer: '',
  seller: '',
  instr: '',
  tier: 'standard',
})

export const feeFor = (productFee: number, tierUp: number): number =>
  Math.round((productFee + tierUp) * 100) / 100

export function duplicateOf<T extends Pick<Order, 'cl' | 'prop'>>(
  d: Pick<Draft, 'addr' | 'client'>,
  orders: () => readonly T[],
): T | undefined {
  return d.addr.trim()
    ? orders().find((o) => o.cl === d.client && o.prop.toLowerCase().trim() === d.addr.toLowerCase().trim())
    : undefined
}

export type DraftField = 'addr' | 'county' | 'client'

export function draftProblem(d: Pick<Draft, 'addr' | 'county' | 'client'>): { field: DraftField; message: string } | null {
  if (!d.addr.trim()) return { field: 'addr', message: 'A property address is required.' }
  if (!d.county.trim())
    return {
      field: 'county',
      message: 'A county is required — it decides the recording conventions and which links the searcher gets.',
    }
  if (!d.client) return { field: 'client', message: 'Choose a client.' }
  return null
}

export function orderFromDraft(
  f: Draft,
  at: { id: string; due: Date; fee: number; recv: Date },
): Order {
  return {
    id: at.id,
    cl: f.client,
    pr: f.product,
    stt: 'search',
    st: f.st,
    co: f.county.trim(),
    prop: f.addr.trim(),
    a: Object.fromEntries(STAGES.map((s) => [s, null])),
    due: at.due,
    recv: at.recv,
    fee: at.fee,
    age: 'just arrived',
    ref: f.ref,
    buyer: f.buyer,
    seller: f.seller,
    instr: f.instr,
    parcel: f.parcel,
    eff: f.eff,
  }
}
