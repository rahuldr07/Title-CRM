import { useState, type ReactNode } from 'react'
import { useSearch } from '@tanstack/react-router'
import { Card, CardHead } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { Field, Fields } from '@/shared/ui/Form'
import { Input, Select, Textarea } from '@/shared/ui/Controls'
import { KeyValues, Rows } from '@/shared/ui/DetailList'
import { PageHead } from '@/shared/ui/PageHead'
import { Tabs } from '@/shared/ui/Tabs'
import { orderLabel, ordersFor, partiesOf, useOrders, workingOn } from '@/domain/orders/orders'
import { FINDINGS_WORK, setOrderField, stageWorkRefusal } from '@/domain/orders/orderWrites'
import { PRODUCTS } from '@/data/catalog'
import { TZ, fmtDT, money } from '@/shared/lib/format'
import { countyName } from '@/domain/counties/counties'
import { useSession } from '@/domain/auth/SessionProvider'
import { useUi } from '@/shared/ui/UiProvider'

const TABS = ['Capture', 'Preview', 'Documents'] as const
type Tab = (typeof TABS)[number]

export default function CommitmentReport() {
  const { can, me } = useSession()
  const { toast } = useUi()
  const refuse = (refused: string | null) => {
    if (refused) toast(refused)
  }
  const orders = ordersFor(me, useOrders())
  const [tab, setTab] = useState<Tab>('Capture')
  const { order: asked } = useSearch({ from: '/commitment' })
  const [orderId, setOrderId] = useState(asked ?? orders[0]?.id ?? '')

  const o = orders.find((x) => x.id === orderId) ?? orders[0]
  if (!o)
    return (
      <PageHead
        title="Commitment report"
        sub={can('all') ? 'There are no orders to build a commitment from.' : 'You are not on any order, so there is none to build a commitment from.'}
      />
    )
  const prod = PRODUCTS.find((p) => p.id === o.pr)
  const { vesting, legal } = partiesOf(o, workingOn(o.id))
  const locked = stageWorkRefusal(me, o.id, FINDINGS_WORK)

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

      <Tabs tabs={[...TABS]} value={tab} onChange={setTab}>
        {tab === 'Capture' ? (
          <Card padded>
            <CardHead title="Which order" />
            <Fields>
              <Field
                label="Order"
                hint={can('all') ? undefined : `The ${orders.length} order${orders.length === 1 ? '' : 's'} you are on. Your account cannot see the rest.`}
              >
                <Select
                  field
                  mono
                  value={o.id}
                  onChange={setOrderId}
                  options={orders.map((x) => [x.id, orderLabel(x)] as const)}
                />
              </Field>
              <Field label="Product">
                <Input field readOnly value={`${prod?.id} — ${prod?.n}`} />
              </Field>
              <Field label="Vesting" wide hint={locked ?? undefined}>
                <Input
                  disabled={!!locked}
                  field
                  id="rg-vest"
                  placeholder="not captured — who holds title"
                  value={vesting}
                  onChange={(e) => refuse(setOrderField(me, o.id, 'vs', e.target.value))}
                />
              </Field>
              <Field label="Legal description" wide>
                <Textarea
                  disabled={!!locked}
                  field
                  id="rg-legal"
                  placeholder="not captured — lot, block, plan and recording reference"
                  value={legal}
                  onChange={(e) => refuse(setOrderField(me, o.id, 'ld', e.target.value))}
                />
              </Field>
            </Fields>
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
      </Tabs>
    </>
  )
}
