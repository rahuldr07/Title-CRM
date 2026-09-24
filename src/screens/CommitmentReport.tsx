import { useState, type ReactNode } from 'react'
import { useSearch } from '@tanstack/react-router'
import { Card, CardHead, Chip, Field, Form, KeyValues, PageHead, Rows, Tabs } from '@/components/ui'
import { partiesOf, setOrderField, useOrders, workingOn } from '@/state/orders'
import { PRODUCTS } from '@/data/catalog'
import { TZ, fmtDT, money, countyName } from '@/lib/format'
import { useSession } from '@/state/session'

const TABS = ['Capture', 'Preview', 'Documents'] as const
type Tab = (typeof TABS)[number]

export default function CommitmentReport() {
  const { can, me } = useSession()
  const orders = useOrders()
  const [tab, setTab] = useState<Tab>('Capture')
  const { order: asked } = useSearch({ from: '/commitment' })
  const [orderId, setOrderId] = useState(asked ?? orders[0]?.id ?? '')

  const o = orders.find((x) => x.id === orderId) ?? orders[0]
  if (!o) return <PageHead title="Commitment report" sub="There are no orders to build a commitment from." />
  const prod = PRODUCTS.find((p) => p.id === o.pr)
  /* Vesting and the legal description are this order's, captured here; a blank is
     left blank rather than filled from a sample order. */
  const { vesting, legal } = partiesOf(o, workingOn(o.id))

  const docs = [
    ['Search package', true],
    ['Vesting deed', true],
    ['Open mortgages', true],
    ['Judgment and lien report', !!o.a['Search QC']],
    ['Tax status', !!o.a['Typing']],
    ['Cover letter', !!o.done],
  ] as [string, boolean][]

  return (
    <>
      <PageHead
        title="Commitment report"
        sub="The commitment a client receives, built from the completed order’s own fields."
      />

      <Tabs tabs={[...TABS]} value={tab} onChange={setTab} />

      {tab === 'Capture' ? (
        <Card padded>
          <CardHead title="Which order" />
          <Form>
            <Field label="Order">
              <select className="inp mono" value={orderId} onChange={(e) => setOrderId(e.target.value)}>
                {orders.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.id} — {x.pr} — {x.prop}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Product">
              <input className="inp" readOnly value={`${prod?.id} — ${prod?.n}`} />
            </Field>
            <div className="fld" style={{ gridColumn: '1/-1' }}>
              <label htmlFor="rg-vest">Vesting</label>
              <input
                className="inp"
                id="rg-vest"
                placeholder="not captured — who holds title"
                value={vesting}
                onChange={(e) => setOrderField(o.id, 'vs', e.target.value, me.n)}
              />
            </div>
            <div className="fld" style={{ gridColumn: '1/-1' }}>
              <label htmlFor="rg-legal">Legal description</label>
              <textarea
                className="inp"
                id="rg-legal"
                placeholder="not captured — lot, block, plan and recording reference"
                value={legal}
                onChange={(e) => setOrderField(o.id, 'ld', e.target.value, me.n)}
              />
            </div>
          </Form>
        </Card>
      ) : null}

      {tab === 'Preview' ? (
        <Card padded>
          <CardHead title={`${o.pr} — ${o.id}`} actions={<Chip kind="b">{o.cl}</Chip>} />
          <div style={{ marginTop: 16 }}>
            <KeyValues
              rows={[
                ['Order number', <span className="mono">{o.id}</span>],
                ['Client', o.cl],
                ['Product', `${prod?.id} — ${prod?.n}`],
                ['Property', o.prop],
                ['County', `${countyName(o.co, o.st)}, ${o.st}`],
                ['Received', <span className="mono">{`${fmtDT(o.recv)} ${TZ}`}</span>],
                ['Due', <span className="mono">{`${fmtDT(o.due)} ${TZ}`}</span>],
                ...(can('pricing') ? [['Fee', <span className="mono">{money(o.fee)}</span>] as [string, ReactNode]] : []),
                ['Vesting', vesting || '—'],
                ['Legal description', legal || '—'],
              ]}
            />
          </div>

        </Card>
      ) : null}

      {tab === 'Documents' ? (
        <Card>
          <CardHead title="Documents in the package" />
          <Rows>
            {docs.map(([name, ready]) => (
              <div className="rw" key={name}>
                <span className={ready ? 'ok' : 'gr'} style={{ fontSize: 'var(--t-lead)' }}>
                  {ready ? '✓' : '·'}
                </span>
                <span>
                  <b>{name}</b>
                  <div className="sd">{ready ? 'Ready to send' : 'Waiting on an earlier stage'}</div>
                </span>
                <span>
                  <Chip kind={ready ? 'v' : 'n'}>{ready ? 'Ready' : 'Pending'}</Chip>
                </span>
              </div>
            ))}
          </Rows>
        </Card>
      ) : null}
    </>
  )
}
