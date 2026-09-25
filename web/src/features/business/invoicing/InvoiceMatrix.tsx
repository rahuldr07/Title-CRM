import { Card } from '@/shared/ui/Card'
import { CellButton, MatrixTable, Th } from '@/shared/ui/MatrixTable'
import { Note } from '@/shared/ui/Layout'
import { ISTATUS } from '@/data/business'
import { labelOf } from '@/shared/lib/format'
import { INVOICE_MONTHS, monthInRange, type DateRange } from '@/domain/invoices/invoices'
import type { Client, Invoice } from '@/data/types'
import { bare, cellFor, grandTotal, monthTotal } from './invoiceView'

export function InvoiceMatrix({
  all,
  clients,
  client,
  month,
  range,
  status,
  setClient,
  setMonth,
}: {
  all: Invoice[]
  clients: Client[]
  client: string
  month: string
  range: DateRange
  status: string
  setClient: (c: string) => void
  setMonth: (m: string) => void
}) {
  return (
    <>
      <Card>
        <div className="tsc">
          <MatrixTable label="Invoiced amount by client and month" min={920}>
            <thead>
              <tr>
                <Th>Client</Th>
                {INVOICE_MONTHS.map((m) => {
                  const on = monthInRange(m, range)
                  return (
                    <Th
                      key={m}
                      num
                      style={{
                        ...(month === m
                          ? { background: 'var(--brandsoft)', color: 'var(--brand)' }
                          : {}),
                        ...(on ? {} : { opacity: 0.35 }),
                      }}
                    >
                      <CellButton
                        title={on ? `Filter to ${m}` : 'outside the date range'}
                        onClick={() => setMonth(month === m ? 'all' : m)}
                      >
                        {m}
                      </CellButton>
                    </Th>
                  )
                })}
                <Th num>Total</Th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const total = INVOICE_MONTHS.reduce((a, m) => a + cellFor(all, c.n, m, status, range).amt, 0)
                return (
                  <tr key={c.n} style={client === c.n ? { background: 'var(--brandsoft)' } : undefined}>
                    <td>
                      <CellButton
                        style={{ fontWeight: 600 }}
                        onClick={() => setClient(client === c.n ? 'all' : c.n)}
                      >
                        {c.n}
                      </CellButton>
                    </td>
                    {INVOICE_MONTHS.map((m) => {
                      const v = cellFor(all, c.n, m, status, range)
                      const on = monthInRange(m, range)
                      return (
                        <td className="n" key={m} style={on ? undefined : { opacity: 0.35 }}>
                          <CellButton
                            style={{ fontFamily: 'var(--mono)' }}
                            title={`${c.n}, ${m} — ${v.n} invoice${v.n === 1 ? '' : 's'}`}
                            onClick={() => {
                              setClient(c.n)
                              setMonth(m)
                            }}
                          >
                            {v.amt ? bare(v.amt) : '—'}
                          </CellButton>
                        </td>
                      )
                    })}
                    <td className="tot">{bare(total)}</td>
                  </tr>
                )
              })}
              <tr>
                <td style={{ fontWeight: 700 }}>All clients</td>
                {INVOICE_MONTHS.map((m) => (
                  <td
                    className="tot"
                    key={m}
                    style={monthInRange(m, range) ? undefined : { opacity: 0.35 }}
                  >
                    {bare(monthTotal(all, m, status, range))}
                  </td>
                ))}
                <td className="tot corner">{bare(grandTotal(all, status, range))}</td>
              </tr>
            </tbody>
          </MatrixTable>
        </div>
      </Card>
      <Note top={10}>
        Amounts invoiced, in dollars. The bottom row totals each month, the right column totals each
        client, and the corner is everything
        {status === 'all' ? '' : ` marked ${labelOf(ISTATUS, status)[0].toLowerCase()}`}
        {range.from || range.to ? ' inside the date range' : ''}.{' '}
        {range.from || range.to
          ? 'Months outside the range are dimmed and excluded from every total.'
          : ''}
      </Note>
    </>
  )
}
