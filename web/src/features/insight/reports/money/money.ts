import { balance } from '@/domain/invoices/invoices'
import { r2 } from '@/shared/lib/format'
import type { Invoice } from '@/data/types'
import type { ReportCsv } from '@/features/insight/reports/reportCsv'

export interface MoneyRow {
  billed: number
  paid: number
  owed: number
  overdue: number
  orders: number
  invoices: number
}

const sum = (list: Invoice[]): MoneyRow => ({
  billed: r2(list.reduce((a, i) => a + i.amt, 0)),
  paid: r2(list.reduce((a, i) => a + i.paid, 0)),
  owed: r2(list.reduce((a, i) => a + balance(i), 0)),
  overdue: r2(list.filter((i) => i.st === 'overdue').reduce((a, i) => a + balance(i), 0)),
  orders: list.reduce((a, i) => a + i.orders, 0),
  invoices: list.length,
})

export function moneyByMonth(invoices: Invoice[]): (MoneyRow & { m: string })[] {
  const months = [...new Map([...invoices].sort((a, b) => a.mi - b.mi).map((i) => [i.m, i.mi])).keys()]
  return months.map((m) => ({ m, ...sum(invoices.filter((i) => i.m === m)) }))
}

export function moneyByClient(invoices: Invoice[]): (MoneyRow & { cl: string })[] {
  return [...new Set(invoices.map((i) => i.cl))]
    .map((cl) => ({ cl, ...sum(invoices.filter((i) => i.cl === cl)) }))
    .sort((a, b) => b.billed - a.billed)
}

export const moneyTotal = sum

export function moneyCsv(months: (MoneyRow & { m: string })[]): ReportCsv {
  return {
    name: 'money-by-month',
    rows: [
      ['Month', 'Invoices', 'Orders', 'Billed', 'Paid against it', 'Still owed', 'Overdue'],
      ...months.map((x) => [x.m, x.invoices, x.orders, x.billed, x.paid, x.owed, x.overdue]),
    ],
  }
}
