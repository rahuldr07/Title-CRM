import { stageName } from '@/domain/company/naming'
import { allOrders } from '@/domain/orders/orders'
import { invoicesNow } from '@/domain/invoices/invoices'
import { LSTATE } from '@/domain/counties/links'
import { currentCounties, currentLinkTypes } from '@/domain/counties/counties'
import { TZ, fmtDate, fmtDT, money } from '@/shared/lib/format'
import { roleName } from '@/domain/auth/permissions'
import { csvName, downloadCSV, type CsvResult } from '@/shared/lib/csv'
import { currentClients } from '@/domain/company/clients'
import { currentStaff } from '@/domain/people/roster'

export function exportEverything(pricing: boolean): CsvResult[] {
  const priced = <T>(cells: T[]): T[] => (pricing ? cells : [])

  const orders = downloadCSV(csvName('orders'), [
    ['Order', 'Client', 'Product', 'State', 'County', 'Status', `Received (${TZ})`, `Due (${TZ})`, ...priced(['Fee'])],
    ...allOrders().map((o) => [o.id, o.cl, o.pr, o.st, o.co, o.stt, fmtDT(o.recv), fmtDT(o.due), ...priced([o.fee])]),
  ])

  const clients = downloadCSV(csvName('clients'), [
    ['Client', 'Display name', 'Orders all time', ...priced(['Invoiced', 'Total', 'Paid']), 'Terms', 'Email'],
    ...currentClients().map((c) => [c.n, c.dn, c.orders, ...priced([c.inv, c.total, c.paid]), c.terms, c.e]),
  ])

  const staff = downloadCSV(csvName('staff'), [
    ['Name', 'Role', 'Departments', 'Daily target', 'Availability', 'Active'],
    ...currentStaff().map((s) => [
      s.n,
      roleName(s.r),
      s.dep.map((d) => stageName(d)).join(' / '),
      s.cap,
      s.avail,
      s.active === false ? 'no' : 'yes',
    ]),
  ])

  const invoices = pricing
    ? [
        downloadCSV(csvName('invoices'), [
          ['Invoice', 'Client', 'Month', 'Issued', 'Status', 'Orders', 'Amount', 'Paid'],
          ...invoicesNow().map((i) => [i.id, i.cl, i.m, fmtDate(i.issued), i.st, i.orders, money(i.amt), money(i.paid)]),
        ]),
      ]
    : []

  const types = currentLinkTypes()
  const counties = downloadCSV(csvName('county-coverage'), [
    ['County', 'State', 'Index from', ...types.flatMap((t) => [t.n, `${t.n} status`])],
    ...currentCounties().map((c) => [
      c.n,
      c.st,
      c.idx ?? 'manual',
      ...types.flatMap((t) => {
        const l = c.links[t.k]
        return [l?.u ?? '', l ? LSTATE[l.s][0] : '—']
      }),
    ]),
  ])

  return [orders, clients, staff, ...invoices, counties]
}
