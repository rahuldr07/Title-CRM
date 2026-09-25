import { useMemo, useState } from 'react'
import { Btn, Pill } from '@/shared/ui/Button'
import { Field } from '@/shared/ui/Form'
import { Input, Select } from '@/shared/ui/Controls'
import { Card } from '@/shared/ui/Card'
import { Kpi, Kpis } from '@/shared/ui/Kpi'
import { PageHead, SectionHead } from '@/shared/ui/PageHead'
import { RequireCap } from '@/shared/ui/RequireCap'
import { useUi } from '@/shared/ui/UiProvider'
import { ISTATUS } from '@/data/business'
import { useClients } from '@/domain/company/clients'
import { fmtDate, labelOf, money } from '@/shared/lib/format'
import { useGo } from '@/shared/hooks/useGo'
import { usePayments } from '@/domain/invoices/payments'
import { csvName, downloadCSV } from '@/shared/lib/csv'
import {
  EMPTY_RANGE,
  INVOICE_MONTHS,
  RANGE_PRESETS,
  balance,
  inRange,
  normalise,
  outstandingOf,
  rangeForMonth,
  rangeMonth,
  sameRange,
  sumBy,
  type DateRange,
  invoicesNow,
} from '@/domain/invoices/invoices'
import type { Invoice } from '@/data/types'
import { InvoiceMatrix } from './InvoiceMatrix'
import { InvoiceTable } from './InvoiceTable'
import { OutstandingList } from './OutstandingList'
import { PaymentForm } from '@/features/business/invoicing/forms/PaymentForm'
import { rangeLabelOf, scopeLabel, statusPills as pillsOf } from './invoiceView'

function Invoicing() {
  const { toast, openModal, closeModal } = useUi()
  const [client, setClient] = useState('all')
  const [range, setRange] = useState<DateRange>(EMPTY_RANGE)
  const [status, setStatus] = useState('all')
  const clients = useClients()
  usePayments()
  const all = invoicesNow(clients)
  const navigate = useGo()

  const takePayment = (i: Invoice) =>
    openModal({
      title: `Record a payment on ${i.id}`,
      body: (
        <PaymentForm
          invoice={i}
          onCancel={closeModal}
          onDone={(msg) => {
            closeModal()
            toast(msg)
          }}
        />
      ),
    })

  const month = rangeMonth(range)
  const filtered = client !== 'all' || !!range.from || !!range.to || status !== 'all'

  const inScope = useMemo(
    () => all.filter((i) => (client === 'all' || i.cl === client) && inRange(i, range)),
    [all, client, range],
  )
  const rows = useMemo(
    () => inScope.filter((i) => status === 'all' || i.st === status),
    [inScope, status],
  )

  const invoiced = sumBy(rows, 'amt')
  const paid = sumBy(rows, 'paid')
  const out = outstandingOf(rows)
  const overdue = rows.filter((i) => i.st === 'overdue')

  const rangeLabel = rangeLabelOf(range, month)

  const scope = scopeLabel(client, rangeLabel, status)

  const clear = () => {
    setClient('all')
    setRange(EMPTY_RANGE)
    setStatus('all')
  }

  const setMonth = (m: string) => setRange(rangeForMonth(m))

  const exportInvoices = () => {
    const out = downloadCSV(csvName('invoices'), [
      ['Invoice', 'Client', 'Code', 'Month', 'Orders', 'Amount', 'Paid', 'Outstanding', 'Status', 'Issued'],
      ...rows.map((i) => [
        i.id,
        i.cl,
        i.code,
        i.m,
        i.orders,
        i.amt,
        i.paid,
        balance(i),
        labelOf(ISTATUS, i.st)[0],
        fmtDate(i.issued),
      ]),
    ])
    const n = out.rows.length - 1
    toast(`${out.name} — ${n} invoice${n === 1 ? '' : 's'}`)
  }

  const showOutstanding = () => {
    const owing = inScope.filter((i) => balance(i) > 0)
    openModal({
      title: `Still to collect — ${money(outstandingOf(owing))}`,
      body: <OutstandingList owing={owing} />,
      footer: (
        <>
          <Btn
            variant="ghost"
            onClick={() => {
              closeModal()
              setStatus('overdue')
            }}
          >
            Just the overdue ones
          </Btn>
          <Btn onClick={closeModal}>Close</Btn>
        </>
      ),
    })
  }

  const statusPills = pillsOf(inScope)

  return (
    <>
      <PageHead
        title="Invoicing"
        sub="Raised when an order is delivered. Every figure below follows the filters."
        actions={
          <>
            <Select
              label="Filter by client"
              style={{ minWidth: 160 }}
              value={client}
              onChange={setClient}
              options={[['all', 'All clients'] as const, ...clients.map((c) => [c.n, c.n] as const)]}
            />
            <Select
              label="Filter by month"
              style={{ minWidth: 150 }}
              value={month}
              onChange={setMonth}
              options={[
                ['all', 'All months'] as const,
                ...INVOICE_MONTHS.map((m) => [m, m] as const),
                ...(month === 'custom' ? [['custom', 'Custom range'] as const] : []),
              ]}
            />
            <Btn variant="ghost" onClick={exportInvoices}>
              Export
            </Btn>
          </>
        }
      />

      <div className="fbar">
        <Field
          layout="bare"
          className="gr"
          style={{ fontSize: 'var(--t-small)', fontWeight: 600 }}
          label="Issued"
        >
          <Input
            field
            label="Invoices issued from"
            mono
            id="iv-from"
            type="date"
            style={{ width: 158 }}
            value={range.from ?? ''}
            onChange={(e) => setRange((r) => normalise({ ...r, from: e.target.value || null }))}
          />
        </Field>
        <span className="gr" style={{ fontSize: 'var(--t-small)' }}>
          to
        </span>
        <Input
          label="Invoices issued to"
          mono
          id="iv-to"
          type="date"
          style={{ width: 158 }}
          value={range.to ?? ''}
          onChange={(e) => setRange((r) => normalise({ ...r, to: e.target.value || null }))}
        />
        <div className="sp">
          {RANGE_PRESETS.map(([label, preset]) => {
            const on = sameRange(preset, range)
            return (
              <Pill key={label} on={on} onClick={() => setRange(preset)}>
                {label}
              </Pill>
            )
          })}
        </div>
      </div>

      <div className="fbar">
        {statusPills.map(([key, label, count]) => (
          <Pill
            key={key}
            urgent={key === 'overdue' && !!count}
            on={status === key}
            count={count}
            onClick={() => setStatus(key)}
          >
            {label}
          </Pill>
        ))}
        {filtered ? (
          <div className="sp">
            <Btn variant="ghost" small onClick={clear}>
              Clear filters
            </Btn>
          </div>
        ) : null}
      </div>

      {month === 'custom' ? (
        <p className="cnt">
          <span>ⓘ</span> Custom range — <b>{rangeLabel}</b>. Choosing a month replaces it.
        </p>
      ) : null}

      <Kpis>
        <Kpi
          title="Invoiced"
          value={money(invoiced)}
          detail={`${rows.length} invoice${rows.length === 1 ? '' : 's'} · ${scope}`}
          onClick={() => setStatus('all')}
        />
        <Kpi
          title="Paid"
          value={<span className="ok">{money(paid)}</span>}
          detail={`${invoiced ? Math.round((paid / invoiced) * 100) : 0}% collected`}
          onClick={() => setStatus('paid')}
        />
        <Kpi
          title="Outstanding"
          value={money(out)}
          tone={out > 0 ? 'warn' : undefined}
          detail={
            <span className={out > 0 ? 'warn' : 'ok'}>{out > 0 ? 'still to collect' : 'all settled'}</span>
          }
          onClick={showOutstanding}
        />
        <Kpi
          title="Overdue"
          value={money(outstandingOf(overdue))}
          tone={overdue.length ? 'alert' : undefined}
          detail={
            <span className={overdue.length ? 'bad' : 'ok'}>
              {overdue.length} invoice{overdue.length === 1 ? '' : 's'}
            </span>
          }
          onClick={() => setStatus('overdue')}
        />
      </Kpis>

      <SectionHead>By client and month — click any figure to filter to it</SectionHead>
      <InvoiceMatrix
        all={all}
        clients={clients}
        client={client}
        month={month}
        range={range}
        status={status}
        setClient={setClient}
        setMonth={setMonth}
      />

      <SectionHead>{filtered ? `Invoices — ${scope}` : 'All invoices'}</SectionHead>
      <p className="cnt">
        <span>ⓘ</span> Showing <b>{rows.length}</b> of <b>{all.length}</b> invoices
      </p>
      <InvoiceTable
        rows={rows}
        scope={scope}
        onPay={takePayment}
        onClear={clear}
        onClient={(code) => navigate({ to: '/clients/$clientCode', params: { clientCode: code } })}
      />

      {rows.length ? (
        <Card padded top={14} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="gr" style={{ fontSize: 'var(--t-small)' }}>
            Total for {scope}
          </span>
          <b className="mono" style={{ fontSize: 'var(--t-h3)' }}>
            {money(invoiced)}
          </b>
          <span className="gr">·</span>
          <span className="ok mono">{money(paid)} paid</span>
          <span className="gr">·</span>
          <span className={`${out > 0 ? 'warn' : 'gr'} mono`}>{money(out)} outstanding</span>
          <Btn variant="ghost" small style={{ marginLeft: 'auto' }} onClick={exportInvoices}>
            Export selection
          </Btn>
        </Card>
      ) : null}
    </>
  )
}

export default function InvoicingRoute() {
  return (
    <RequireCap cap="pricing">
      <Invoicing />
    </RequireCap>
  )
}
