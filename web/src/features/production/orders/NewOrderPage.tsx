import { useMemo, useState } from 'react'
import { useGo } from '@/shared/hooks/useGo'
import { Btn } from '@/shared/ui/Button'
import { PageHead } from '@/shared/ui/PageHead'
import { RequireCap } from '@/shared/ui/RequireCap'
import { useUi } from '@/shared/ui/UiProvider'
import { useSession } from '@/domain/auth/SessionProvider'
import { draftFromMail, type Draft } from './fromMail'
import { MAILBOX } from '@/data/intake'
import { useSearch } from '@tanstack/react-router'
import { PRODUCTS } from '@/data/catalog'
import { addOrder, allOrders, nextOrderId, pipelineLoad } from '@/domain/orders/orders'
import { previewAssign } from '@/domain/assignment/engine'
import { findCounty } from '@/domain/counties/links'
import { dueFor, slaRuleFor, tierOf } from '@/domain/assignment/sla'
import { fmtDT, TZ } from '@/shared/lib/format'
import { now } from '@/shared/lib/clock'
import { statusName } from '@/domain/company/statuses'
import { useClients } from '@/domain/company/clients'
import { blankOrder, draftProblem, duplicateOf, feeFor, orderFromDraft, type DraftField } from './newOrder'
import { Form, FormAlert } from '@/shared/ui/Form'
import { useFormAlert } from '@/shared/hooks/useFormAlert'
import { NewOrderAside } from './NewOrderAside'
import { NewOrderForm } from './NewOrderForm'

function NewOrder() {
  const clients = useClients()
  const navigate = useGo()
  const { toast } = useUi()
  const { can, me } = useSession()
  const pricing = can('pricing')
  const { mail } = useSearch({ from: '/orders/new' })
  const [f, setF] = useState<Draft>(() => {
    const read = mail ? MAILBOX(now()).find((m) => m.x.some(([k, v]) => k === 'Order no' && v === mail)) : undefined
    return { ...blankOrder(), ...(read ? draftFromMail(read) : {}) }
  })
  const alert = useFormAlert<DraftField>()

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setF((d) => ({ ...d, [k]: v }))
    alert.clear()
  }

  const product = PRODUCTS.find((p) => p.id === f.product) ?? PRODUCTS[0]
  const productId = product?.id ?? f.product
  const productFee = product?.fee ?? 0
  const tier = tierOf(f.tier)
  const sla = slaRuleFor(f.client, f.product)
  const due = useMemo(() => dueFor(f.client, f.product, f.tier), [f.client, f.product, f.tier])
  const county = f.county ? findCounty(f.county, f.st) : undefined
  const fee = feeFor(productFee, tier.up)
  const dupe = duplicateOf(f, allOrders)

  const preview = useMemo(
    () =>
      previewAssign({ pr: f.product, st: f.st, cl: f.client, co: f.county || null }, pipelineLoad()),
    [f.product, f.st, f.client, f.county],
  )

  const create = () => {
    const problem = draftProblem(f)
    if (problem) return alert.fail(problem.message, problem.field)
    const id = nextOrderId()
    const refused = addOrder(me, orderFromDraft(f, { id, due: due.at, fee, recv: now() }))
    if (refused) return alert.fail(refused)
    toast(`${id} taken — due ${fmtDT(due.at)} ${TZ}`)
    navigate({ to: '/orders/$orderId', params: { orderId: id } })
  }

  return (
    <>
      <PageHead
        parent={{ to: '/orders', label: 'Orders' }}
        title="New order"
        sub="Everything on the right updates as you type — the due date, the coverage, and who would pick it up."
      />

      <Form onSubmit={create}>
        <FormAlert alert={alert} bottom={16} />

        {dupe ? (
          <div className="bnr r">
            <span className="bi">⚑</span>
            <div>
              <div className="bt">{f.client} already has an order on this address</div>
              {dupe.id} — {statusName(dupe.stt)}, due {fmtDT(dupe.due)} {TZ}. Placing another may be a
              duplicate.
            </div>
            <div className="ba">
              <Btn
                variant="ghost"
                small
                onClick={() => navigate({ to: '/orders/$orderId', params: { orderId: dupe.id } })}
              >
                Open it
              </Btn>
            </div>
          </div>
        ) : null}

        <div className="two">
          <NewOrderForm f={f} set={set} clients={clients} pricing={pricing} errorOn={alert.on} />
          <NewOrderAside
            f={f}
            due={due}
            sla={sla}
            tier={tier}
            productId={productId}
            productFee={productFee}
            fee={fee}
            county={county}
            preview={preview}
            pricing={pricing}
            navigate={navigate}
          />
        </div>
      </Form>
    </>
  )
}

export default function NewOrderRoute() {
  return (
    <RequireCap cap="all">
      <NewOrder />
    </RequireCap>
  )
}
