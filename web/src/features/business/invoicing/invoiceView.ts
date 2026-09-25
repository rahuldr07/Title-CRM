import { ISTATUS } from '@/data/business'
import { fmtDate, labelOf, money } from '@/shared/lib/format'
import { inRange, sumBy, type DateRange } from '@/domain/invoices/invoices'
import type { Invoice } from '@/data/types'

export const bare = (n: number) => money(n).replace('$', '')

export function rangeLabelOf(range: DateRange, month: string): string | null {
  if (month === 'all') return null
  if (month !== 'custom') return month
  return `${range.from ? fmtDate(new Date(range.from)) : 'anything'} to ${range.to ? fmtDate(new Date(range.to)) : 'now'}`
}

export function scopeLabel(client: string, rangeLabel: string | null, status: string): string {
  return (
    [client !== 'all' ? client : null, rangeLabel, status !== 'all' ? labelOf(ISTATUS, status)[0].toLowerCase() : null]
      .filter(Boolean)
      .join(' · ') || 'everything'
  )
}

const shown = (i: Invoice, status: string, range: DateRange) =>
  (status === 'all' || i.st === status) && inRange(i, range)

export function cellFor(all: Invoice[], name: string, m: string, status: string, range: DateRange) {
  const list = all.filter((i) => i.cl === name && i.m === m && shown(i, status, range))
  return { amt: sumBy(list, 'amt'), n: list.length }
}

export const monthTotal = (all: Invoice[], m: string, status: string, range: DateRange) =>
  sumBy(
    all.filter((i) => i.m === m && shown(i, status, range)),
    'amt',
  )

export const grandTotal = (all: Invoice[], status: string, range: DateRange) =>
  sumBy(
    all.filter((i) => shown(i, status, range)),
    'amt',
  )

export function statusPills(inScope: Invoice[]): [key: string, label: string, count: number][] {
  return [
    ['all', 'All', inScope.length],
    ...Object.entries(ISTATUS).map(
      ([k, v]) => [k, v[0], inScope.filter((i) => i.st === k).length] as [string, string, number],
    ),
  ]
}
