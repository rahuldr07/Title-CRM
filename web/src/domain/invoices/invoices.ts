import { INVOICES } from '@/data/business'
import { MONTHS, iso, parseIso, r2 } from '@/shared/lib/format'
import { now } from '@/shared/lib/clock'
import { currentClients } from '@/domain/company/clients'
import { paidSince } from './payments'
import type { Client, Invoice } from '@/data/types'

export const INVOICE_MONTHS: string[] = [
  ...new Map(
    [...INVOICES].sort((a, b) => a.mi - b.mi).map((i) => [i.m, i.mi] as const),
  ).keys(),
]

function monthBounds(month: string): [string, string] {
  const [mon, year] = month.split(' ')
  const m = MONTHS.indexOf(mon ?? '')
  const y = Number(year)
  if (m < 0 || !Number.isFinite(y)) return ['', '']
  return [iso(new Date(y, m, 1)), iso(new Date(y, m + 1, 0))]
}

export interface DateRange {
  from: string | null
  to: string | null
}

export const EMPTY_RANGE: DateRange = { from: null, to: null }

export function inRange(i: Invoice, { from, to }: DateRange): boolean {
  if (!from && !to) return true
  if (from && i.issued < parseIso(from)) return false
  if (to) {
    const end = parseIso(to)
    end.setHours(23, 59, 59)
    if (i.issued > end) return false
  }
  return true
}

export function rangeMonth({ from, to }: DateRange): string {
  if (!from && !to) return 'all'
  for (const m of INVOICE_MONTHS) {
    const [a, b] = monthBounds(m)
    if (a === from && b === to) return m
  }
  return 'custom'
}

export function monthInRange(month: string, range: DateRange): boolean {
  const [a, b] = monthBounds(month)
  return (!range.from || b >= range.from) && (!range.to || a <= range.to)
}

export function rangeForMonth(month: string): DateRange {
  if (month === 'all' || month === 'custom') return EMPTY_RANGE
  const [from, to] = monthBounds(month)
  return { from, to }
}

export function normalise(range: DateRange): DateRange {
  const { from, to } = range
  return from && to && from > to ? { from: to, to: from } : range
}

const monthAt = (i: number) => INVOICE_MONTHS[i] ?? ''
const LAST_MONTH = INVOICE_MONTHS.length - 1

export const RANGE_PRESETS: [label: string, range: DateRange][] = [
  ['All time', EMPTY_RANGE],
  ['This month', rangeForMonth(monthAt(LAST_MONTH))],
  [
    'Last 3 months',
    {
      from: monthBounds(monthAt(Math.max(0, INVOICE_MONTHS.length - 3)))[0],
      to: monthBounds(monthAt(LAST_MONTH))[1],
    },
  ],
  [
    'Year to date',
    { from: monthBounds(monthAt(0))[0], to: monthBounds(monthAt(LAST_MONTH))[1] },
  ],
]

export const sameRange = (a: DateRange, b: DateRange) =>
  (a.from ?? null) === (b.from ?? null) && (a.to ?? null) === (b.to ?? null)

export const sumBy = (list: Invoice[], k: 'amt' | 'paid') =>
  r2(list.reduce((a, x) => a + x[k], 0))

export const balance = (i: Invoice) => r2(i.amt - i.paid)

export const outstandingOf = (list: Invoice[]) => r2(sumBy(list, 'amt') - sumBy(list, 'paid'))

type InvoiceStatus = Invoice['st']

const termDays = (terms: string): number => Number(/net\s*(\d+)/i.exec(terms)?.[1] ?? 0)

function dueOn(i: Invoice, terms: string): Date {
  const d = new Date(i.issued)
  d.setDate(d.getDate() + termDays(terms))
  d.setHours(23, 59, 59, 999)
  return d
}

function statusOf(i: Invoice, terms: string, today: Date = now()): InvoiceStatus {
  if (balance(i) <= 0) return 'paid'
  if (today > dueOn(i, terms)) return 'overdue'
  return i.paid > 0 ? 'part' : 'open'
}

export function invoicesNow(clients: Client[] = currentClients()): Invoice[] {
  const terms = new Map(clients.map((c) => [c.n, c.terms]))
  return INVOICES.map((seed) => {
    const i = { ...seed, paid: r2(seed.paid + paidSince(seed.id)) }
    return { ...i, st: statusOf(i, terms.get(i.cl) ?? '') }
  })
}

export function unbilledOrders(client: Pick<Client, 'n' | 'orders'>, invoices: Invoice[]): number {
  const billed = invoices.filter((i) => i.cl === client.n).reduce((a, i) => a + i.orders, 0)
  return Math.max(0, client.orders - billed)
}
