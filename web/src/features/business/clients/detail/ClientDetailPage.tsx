import { useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { useGo } from '@/shared/hooks/useGo'
import { Banner, Empty } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { MailLink } from '@/shared/ui/Anchor'
import { Card, CardHead, Label } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { KeyValues, Row, Rows } from '@/shared/ui/DetailList'
import { Kpi, Kpis } from '@/shared/ui/Kpi'
import { NotFoundRecord } from '@/shared/ui/NotFoundRecord'
import { PageHead } from '@/shared/ui/PageHead'
import { Tabs } from '@/shared/ui/Tabs'
import { DataTable, type DataRow } from '@/shared/ui/DataTable'
import { RequireCap } from '@/shared/ui/RequireCap'
import { useNotBuilt } from '@/shared/hooks/useNotBuilt'
import { useUi } from '@/shared/ui/UiProvider'
import { useClients } from '@/domain/company/clients'
import { useClock, useSla } from '@/domain/assignment/turnaround'
import { usePayments } from '@/domain/invoices/payments'
import { useClientEditor } from '@/shared/editors/useClientEditor'
import { PrefixForm } from './PrefixForm'
import { removePrefix, usePrefixes } from './prefixes'
import { ISTATUS } from '@/data/business'
import { balance, invoicesNow, outstandingOf, unbilledOrders } from '@/domain/invoices/invoices'
import { labelOf, money, r2 } from '@/shared/lib/format'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { useSession } from '@/domain/auth/SessionProvider'
import { Inline, Note } from '@/shared/ui/Layout'

const TABS = ['Overview', 'Turnaround', 'Invoices', 'Order prefixes'] as const
type Tab = (typeof TABS)[number]

const CLOCK_RUN: Record<string, string> = {
  '247': '24/7 incl. weekends',
  biz: 'Business hours only',
}

function ClientDetail() {
  const { me } = useSession()
  const { clientCode } = useParams({ from: '/clients/$clientCode' })
  const navigate = useGo()
  const { openModal, closeModal, toast } = useUi()
  const notBuilt = useNotBuilt()
  const { editClient } = useClientEditor()
  const clients = useClients()
  usePayments()
  const sla = useSla()
  const clock = useClock()
  const prefixMap = usePrefixes()
  const [tab, setTab] = useState<Tab>('Overview')

  const client = clients.find((c) => c.n === clientCode)

  if (!client) {
    return <NotFoundRecord what="client" backTo="/company" backLabel="Clients" />
  }

  const c = client
  const outstanding = r2(c.total - c.paid)
  const collected = c.total ? Math.round((c.paid / c.total) * 100) : 0
  const unbilled = unbilledOrders(c, invoicesNow())
  const mine = invoicesNow().filter((x) => x.cl === c.n).sort((a, b) => +b.issued - +a.issued)
  const theirSla = sla.filter((s) => s.cl === c.n)
  const prefixes = prefixMap[c.n] ?? []

  const openOutstanding = () =>
    openModal({
      title: `${c.n} — ${money(outstandingOf(mine))} outstanding`,
      body: (
        <>
          {mine.some((i) => balance(i) > 0) ? (
            <Rows>
              {mine
                .filter((i) => balance(i) > 0)
                .map((i) => (
                  <Row
                    key={i.id}
                    icon={<span className={i.st === 'overdue' ? 'bad' : 'gr'}>·</span>}
                    title={i.m}
                    detail={`invoiced ${money(i.amt)}${
                      i.paid ? `, ${money(i.paid)} received` : ', nothing received'
                    }`}
                    right={
                      <span className={`mono ${i.st === 'overdue' ? 'bad' : 'gr'}`}>
                        {money(balance(i))}
                      </span>
                    }
                  />
                ))}
            </Rows>
          ) : (
            <Note size="body" margin={0}>
              Nothing outstanding — every invoice is settled.
            </Note>
          )}
          <Note top={12}>
            Invoices are raised when an order is delivered, so a gap here is either work that never
            completed or billing that never happened.
          </Note>
        </>
      ),
      footer: (
        <>
          <Btn
            variant="ghost"
            onClick={() => {
              closeModal()
              setTab('Invoices')
            }}
          >
            Every invoice
          </Btn>
          <Btn onClick={closeModal}>Close</Btn>
        </>
      ),
    })

  const addPrefixModal = () =>
    openModal({
      title: `Add a prefix for ${c.n}`,
      body: (
        <PrefixForm
          client={c}
          onCancel={closeModal}
          onDone={(m) => {
            closeModal()
            toast(m)
          }}
        />
      ),
    })

  const openSla = () => navigate({ to: '/company', search: { tab: 'Turnaround & SLA', sub: 'Client promise' } })

  const overview = (
    <>
      <Kpis>
        <Kpi
          title="Orders"
          value={c.orders.toLocaleString()}
          detail="lifetime"
          hint="How this client is served"
          onClick={() => setTab('Turnaround')}
        />
        <Kpi
          title="Invoiced"
          value={money(c.total)}
          detail="lifetime"
          hint="Every invoice"
          onClick={() => setTab('Invoices')}
        />
        <Kpi
          title="Paid"
          value={<span className="ok">{money(c.paid)}</span>}
          detail={`${collected}% collected`}
          hint="Every invoice"
          onClick={() => setTab('Invoices')}
        />
        <Kpi
          title="Outstanding"
          value={money(outstanding)}
          tone={outstanding > 0 ? 'warn' : undefined}
          detail={outstanding > 0 ? 'still to collect' : 'all settled'}
          hint="What is still owed"
          onClick={openOutstanding}
        />
      </Kpis>

      {unbilled ? (
        <Banner
          kind="r"
          icon="⚑"
          title={`${unbilled.toLocaleString()} orders with no invoice`}
          top={16}
          actions={
            <Btn
              variant="ghost"
              small
              onClick={() =>
                notBuilt('The reconciliation report', 'your ledger, to compare against')
              }
            >
              Investigate
            </Btn>
          }
        >
          {c.orders.toLocaleString()} orders, of which {mine.reduce((a, i) => a + i.orders, 0).toLocaleString()} are billed on
          {' '}{mine.length} invoices. Either work
          that never completed, or billing that never happened.
          <div className="bs">Worth reconciling before it becomes a year of drift.</div>
        </Banner>
      ) : null}

      <Card padded top={16}>
        <Label>Details</Label>
        <KeyValues
          rows={[
            ['Name', c.n],
            ['Code on orders', <span className="mono">{c.dn}</span>],
            [
              'Email',
              c.e ? (
                <MailLink address={c.e} />
              ) : (
                <span className="gr">not recorded</span>
              ),
            ],
            ['Phone', c.p ? c.p : <span className="gr">not recorded</span>],
            ['Payment terms', c.terms || 'Net 30'],
            [
              'Status',
              c.active === false ? <Chip kind="n">Inactive</Chip> : <Chip kind="v">Active</Chip>,
            ],
          ]}
        />
        <Inline align={false} gap={9} wrap style={{ marginTop: 16 }}>
          <Btn onClick={() => editClient(c.n)}>Edit client</Btn>
          <Btn variant="ghost" onClick={() => setTab('Turnaround')}>
            Set turnaround
          </Btn>
        </Inline>
      </Card>
    </>
  )

  const TCOLS = '1fr 130px 150px 160px'

  const turnaround = (
    <Card>
      <CardHead
        title={`What you’ve promised ${c.n}`}
        actions={
          <Btn small onClick={openSla}>
            ＋ Add product
          </Btn>
        }
      />
      <FlexTable cols={TCOLS} min={640} head={['Product', 'Turnaround', 'Clock', '']} wrap="none">
        {theirSla.length ? (
          theirSla.map((s, i) => (
            <FlexRow key={`${s.pr}-${i}`}>
              <Cell>
                <div className="v">{s.pr}</div>
              </Cell>
              <Cell>
                <div className="v mono">{s.h}h</div>
              </Cell>
              <Cell>
                <div className="v gr" style={{ fontSize: 'var(--t-small)' }}>
                  {CLOCK_RUN[clock.run] ?? clock.run}
                </div>
              </Cell>
              <Cell>
                <Btn variant="ghost" small onClick={openSla}>
                  Edit
                </Btn>
              </Cell>
            </FlexRow>
          ))
        ) : (
          <Empty
            icon="◷"
            action={
              <Btn small onClick={openSla}>
                Set turnaround
              </Btn>
            }
          >
            No SLA set — orders for {c.n} fall back to the 24h default.
          </Empty>
        )}
      </FlexTable>
    </Card>
  )

  const invoiceRows: DataRow[] = mine.map((x) => {
    const bal = balance(x)
    const [label, kind] = labelOf(ISTATUS, x.st)
    return {
      id: x.id,
      k: [bal > 0 ? 'owing' : 'paid', ...(x.st === 'overdue' ? ['overdue'] : [])],
      search: `${x.id} ${x.m}`,
      c: [
        { v: x.id, mono: true },
        { v: x.m },
        { v: x.orders.toLocaleString(), mono: true },
        { v: money(x.amt), mono: true },
        { v: x.paid ? money(x.paid) : '—', mono: true },
        { v: bal > 0 ? money(bal) : '—', mono: true },
        { v: label, chip: kind },
      ],
    }
  })

  const invoices = (
    <DataTable
      noun="invoices"
      total={mine.length}
      min={880}
      search="Search by invoice or month"
      pills={[
        { key: 'all', label: 'All', count: mine.length },
        {
          key: 'owing',
          label: 'Owing',
          count: mine.filter((x) => balance(x) > 0).length,
          urgent: true,
        },
        {
          key: 'overdue',
          label: 'Overdue',
          count: mine.filter((x) => x.st === 'overdue').length,
          urgent: true,
        },
        { key: 'paid', label: 'Settled', count: mine.filter((x) => balance(x) <= 0).length },
      ]}
      cols={[
        { l: 'Invoice', w: 150 },
        { l: 'Month', w: 110 },
        { l: 'Orders', w: 90 },
        { l: 'Amount', w: 120 },
        { l: 'Received', w: 120 },
        { l: 'Outstanding', w: 120 },
        { l: 'Status', w: 120 },
      ]}
      rows={invoiceRows}
      emptyText={`Nothing has been invoiced to ${c.n} yet.`}
    />
  )

  const prefixTab = (
    <Card>
      <CardHead
        title={`Order number prefixes that belong to ${c.n}`}
        actions={
          <Btn small onClick={addPrefixModal}>
            ＋ Add
          </Btn>
        }
      />
      <Rows bare>
        {prefixes.length ? (
          prefixes.map((p) => (
            <div className="rw" key={p}>
              <span className="gr">↳</span>
              <span>
                <b className="mono">{p}…</b>
                <div className="sd">Incoming mail carrying this prefix resolves to {c.n}</div>
              </span>
              <span>
                <Btn
                  variant="ghost"
                  small
                  onClick={() => {
                    const refused = removePrefix(me, c.n, p)
                    if (refused) return toast(refused)
                    toast(`${p} removed — mail with that prefix now needs matching by hand`)
                  }}
                >
                  Remove
                </Btn>
              </span>
            </div>
          ))
        ) : (
          <div className="empty" style={{ padding: '26px 10px' }}>
            <Empty icon="↳" action={<Btn small onClick={addPrefixModal}>Add one</Btn>}>
              No prefixes — mail for {c.n} has to be matched by hand.
            </Empty>
          </div>
        )}
      </Rows>
    </Card>
  )

  return (
    <>
      <PageHead
        parent={{ to: '/company', search: { tab: 'Clients' }, label: 'Clients' }}
        title={c.n}
        sub={`Client code ${c.dn} · ${c.orders.toLocaleString()} orders · ${c.terms || 'Net 30'}`}
        actions={
          <>
            {c.active === false ? <Chip kind="n">Inactive</Chip> : null}
            <Btn variant="ghost" onClick={() => editClient(c.n)}>
              Edit client
            </Btn>
          </>
        }
      />

      <Tabs tabs={[...TABS]} value={tab} onChange={setTab}>
        {tab === 'Overview' ? overview : null}
        {tab === 'Turnaround' ? turnaround : null}
        {tab === 'Invoices' ? invoices : null}
        {tab === 'Order prefixes' ? prefixTab : null}
      </Tabs>
    </>
  )
}

export default function Guarded() {
  return (
    <RequireCap cap="pricing">
      <ClientDetail />
    </RequireCap>
  )
}
