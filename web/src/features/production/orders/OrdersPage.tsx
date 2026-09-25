import { useStageName } from '@/domain/company/naming'
import { useEffect, useMemo } from 'react'
import { useSearch } from '@tanstack/react-router'
import { useGo } from '@/shared/hooks/useGo'
import { Avatar } from '@/shared/ui/Avatar'
import { Banner } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Due } from '@/shared/ui/Chip'
import { PageHead } from '@/shared/ui/PageHead'
import { DataTable, type DataRow, type SelectFilter } from '@/shared/ui/DataTable'
import { useSession } from '@/domain/auth/SessionProvider'
import { useUi } from '@/shared/ui/UiProvider'
import { rememberOrdersView, type OrdersView } from './ordersView'
import { ordersFor, useOrders } from '@/domain/orders/orders'
import { STAGES } from '@/data/org'
import { TZ, fmtDT, fmtDate, iso, parseIso } from '@/shared/lib/format'
import { SOON_HOURS, orderChipKind, orderState, type OrderState, deliveryOf } from '@/domain/orders/orderState'
import { routeNeeds } from '@/domain/auth/permissions'
import { hh, orderAtRisk, orderPlan } from '@/domain/assignment/sla'
import { csvName, downloadCSV } from '@/shared/lib/csv'
import { whoName, useStaff, findPerson } from '@/domain/people/roster'
import { statusName, useStatuses } from '@/domain/company/statuses'
import { Note } from '@/shared/ui/Layout'

const uniq = (xs: string[]) => [...new Set(xs)].sort()

const allFirst = (allLabel: string, values: string[], label = (v: string) => v): [string, string][] => [
  ['all', allLabel],
  ...values.map((v) => [v, label(v)] as [string, string]),
]

export default function Orders() {
  const roster = useStaff()
  const statuses = useStatuses()
  const stageName = useStageName()
  const st = (k: string) => statusName(k, statuses)
  const { me, tenant, can } = useSession()
  const { toast } = useUi()
  const navigate = useGo()

  const view = useSearch({ from: '/orders' })
  const pill = view.pill ?? 'all'
  const product = view.pr ?? 'all'
  const client = view.cl ?? 'all'
  const dept = view.dept ?? 'all'
  const staff = view.staff ?? 'all'
  const dueDate = view.due ?? 'all'

  useEffect(() => rememberOrdersView(view), [view])

  const setView = (patch: OrdersView) => {
    const next = Object.fromEntries(
      Object.entries({ ...view, ...patch }).filter(([, v]) => v && v !== 'all'),
    ) as OrdersView
    navigate({ to: '/orders', search: next, replace: true })
  }
  const setPill = (v: string) => setView({ pill: v })
  const setProduct = (v: string) => setView({ pr: v })
  const setClient = (v: string) => setView({ cl: v })
  const setStaff = (v: string) => setView({ staff: v })
  const setDueDate = (v: string) => setView({ due: v })

  const reportsNeed = routeNeeds('reports')
  const mayReport = !reportsNeed || can(reportsNeed)
  const mayCreate = can('all')

  const orders = useOrders()
  const scope = ordersFor(me, orders)

  const base = useMemo(
    () =>
      scope.filter(
        (o) =>
          (staff === 'all' || Object.values(o.a).includes(staff)) &&
          (dept === 'all' || !!o.a[dept]) &&
          (product === 'all' || o.pr === product) &&
          (client === 'all' || o.cl === client) &&
          (dueDate === 'all' || iso(o.due) === dueDate),
      ),
    [scope, staff, dept, product, client, dueDate],
  )

  const stateOf = (o: (typeof base)[number]): OrderState | 'risk' =>
    orderState(o) === 'open' && orderAtRisk(o) ? 'risk' : orderState(o)
  const inState = (k: OrderState | 'risk') => base.filter((o) => stateOf(o) === k).length

  const rows: DataRow[] = base.map((o) => {
    const plan = orderPlan(o)
    return {
      id: o.id,
      k: stateOf(o),
      onClick: () => navigate({ to: '/orders/$orderId', params: { orderId: o.id } }),
      search: `${o.id} ${o.prop} ${o.cl} ${o.co} ${o.st} ${o.pr}`,
      c: [
        { v: o.id, mono: true, s: o.cl },
        { v: o.pr },
        { v: o.prop, s: `${o.co}, ${o.st}` },
        { v: st(o.stt), chip: orderChipKind(o) },
        {
          raw: (
            <>
              <Due at={o.due} sent={deliveryOf(o)} />
              {orderAtRisk(o) ? (
                <div className="s bad">short {hh(plan.short)} for the stages left</div>
              ) : plan.behind ? (
                <div className="s warn">
                  behind its {stageName(plan.rows.find((r) => r.behind)?.stage ?? '')} checkpoint
                </div>
              ) : null}
            </>
          ),
        },
        {
          raw: (
            <div className="asg">
              {STAGES.map((s) => {
                const a = o.a[s]
                const person = a ? findPerson(roster, a) : undefined
                const conflict = !!person?.conflict && (s === 'Typing' || s === 'Typing QC')
                return (
                  <Avatar
                    key={s}
                    name={a ? whoName(a) : null}
                    self={conflict}
                    title={a ? `${stageName(s)}: ${whoName(a)} — open their profile` : `${stageName(s)}: unassigned`}
                    onClick={
                      a
                        ? (e) => {
                            e.stopPropagation()
                            navigate({ to: '/staff/$personId', params: { personId: a } })
                          }
                        : undefined
                    }
                  />
                )
              })}
            </div>
          ),
        },
      ],
    }
  })

  const staffName = staff === 'all' ? null : whoName(staff)
  const active = [
    dept !== 'all' ? <>in <b>{stageName(dept)}</b></> : null,
    staffName ? <>with <b>{staffName}</b></> : null,
    product !== 'all' ? <>for <b>{product}</b></> : null,
    client !== 'all' ? <>from <b>{client}</b></> : null,
    dueDate !== 'all' ? <>due <b>{fmtDate(parseIso(dueDate))}</b></> : null,
  ].filter(Boolean)

  const clearFilters = () => setView({ staff: 'all', dept: 'all', pr: 'all', cl: 'all', due: 'all' })

  const openWorkload = () =>
    navigate({
      to: '/reports',
      search: staff !== 'all' ? { tab: 'By staff', sw: staff } : { tab: 'By department', dw: dept },
    })

  const withFee = can('pricing')
  const exportOrders = () => {
    const out = downloadCSV(csvName('orders'), [
      ['Order', 'Client', 'Product', 'Property', 'County', 'State', 'Stage', `Due (${TZ})`, `Received (${TZ})`, ...(withFee ? ['Fee'] : []), ...STAGES.map((s) => stageName(s))],
      ...base.map((o) => [
        o.id,
        o.cl,
        o.pr,
        o.prop,
        o.co,
        o.st,
        st(o.stt),
        fmtDT(o.due),
        fmtDT(o.recv),
        ...(withFee ? [o.fee] : []),
        ...STAGES.map((s) => (o.a[s] ? whoName(o.a[s]) : '')),
      ]),
    ])
    toast(`${out.name} — ${out.rows.length - 1} rows`)
  }

  const peopleFilters: SelectFilter[] = can('all')
    ? [
        {
          label: 'Department',
          value: dept,
          onChange: (v) =>
            setView({
              dept: v,
              ...(v !== 'all' && staff !== 'all' && !findPerson(roster, staff)?.dep.includes(v)
                ? { staff: 'all' }
                : {}),
            }),
          options: allFirst('All departments', [...STAGES], stageName),
        },
        {
          label: 'Staff',
          value: staff,
          onChange: setStaff,
          options: [
            ['all', 'All staff'],
            ...roster.filter((s) => s.dep.length && (dept === 'all' || s.dep.includes(dept))).map(
              (s) => [s.id, s.n] as [string, string],
            ),
          ],
        },
      ]
    : []

  return (
    <>
      <PageHead
        title="Orders"
        sub={
          can('all')
            ? `Every order in ${tenant.name}. One owner per stage — the dashed circles are nobody.`
            : `The ${scope.length} order${scope.length === 1 ? '' : 's'} you are on. Your account cannot see the rest, which is the point of the permission — not a limitation of the screen.`
        }
        actions={
          <>
            <Btn variant="ghost" onClick={exportOrders}>
              Export
            </Btn>
            {mayCreate ? <Btn onClick={() => navigate({ to: '/orders/new' })}>＋ New order</Btn> : null}
          </>
        }
      />

      {active.length ? (
        <Banner
          icon="◔"
          title={
            <>
              Showing orders{' '}
              {active.map((a, i) => (
                <span key={i}>
                  {i ? ' and ' : ''}
                  {a}
                </span>
              ))}
            </>
          }
          actions={
            <>
              <Btn variant="ghost" onClick={clearFilters}>
                Clear
              </Btn>
              {mayReport ? <Btn onClick={openWorkload}>Workload report</Btn> : null}
            </>
          }
        >
          {base.length} of {scope.length}.
          {mayReport
            ? ' For the completed-and-pending breakdown across today’s whole intake, open the workload report.'
            : null}
        </Banner>
      ) : null}

      <DataTable
        noun="orders"
        min={1080}
        total={base.length}
        wideFilters
        search="Search order #, property or client"
        activePill={pill}
        onPill={setPill}
        pills={[
          { key: 'all', label: 'All', count: base.length },
          { key: 'late', label: 'Past due', count: inState('late'), urgent: true },
          { key: 'soon', label: `Due < ${SOON_HOURS}h`, count: inState('soon'), urgent: true },
          { key: 'risk', label: 'At risk', count: inState('risk'), urgent: true },
          { key: 'open', label: 'On track', count: inState('open') },
          { key: 'done', label: 'Delivered', count: inState('done') },
        ]}
        filters={[
          {
            label: 'Product',
            value: product,
            onChange: setProduct,
            options: allFirst('All products', uniq(orders.map((o) => o.pr))),
          },
          {
            label: 'Client',
            value: client,
            onChange: setClient,
            options: allFirst('All clients', uniq(orders.map((o) => o.cl))),
          },
          ...peopleFilters,
        ]}
        dateFilter={{ label: 'Due date', value: dueDate, onChange: setDueDate }}
        cols={[
          { l: 'Order', w: 120 },
          { l: 'Product', w: 95 },
          { l: 'Property', w: 190, f: 1.4 },
          { l: 'Stage', w: 120 },
          { l: 'Due', w: 180 },
          { l: `Stage owners, ${stageName('Search')} → ${stageName('RTS')}`, w: 190 },
        ]}
        rows={rows}
        numbered
        emptyText="No orders match this filter."
        emptyAction={
          active.length ? (
            <Btn small variant="ghost" onClick={clearFilters}>
              Clear filters
            </Btn>
          ) : undefined
        }
      />

      <Note top={12}>
        A red ring on an avatar means the same person is set to both type and QC that order —{' '}
        <b>self-review</b>. Assignment blocks it; see Quality.
      </Note>
    </>
  )
}
