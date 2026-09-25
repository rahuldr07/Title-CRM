import { useStageName } from '@/domain/company/naming'
import { useMemo, useState } from 'react'
import { useGo } from '@/shared/hooks/useGo'
import { Btn, Press } from '@/shared/ui/Button'
import { Chip, Due } from '@/shared/ui/Chip'
import { Empty } from '@/shared/ui/Banner'
import { Kpi, Kpis } from '@/shared/ui/Kpi'
import { PageHead, SectionHead } from '@/shared/ui/PageHead'
import { Row, Rows } from '@/shared/ui/DetailList'
import { RequireCap } from '@/shared/ui/RequireCap'
import { useSession } from '@/domain/auth/SessionProvider'
import { useUi } from '@/shared/ui/UiProvider'
import { openExceptions, useOrders } from '@/domain/orders/orders'
import { STAGES } from '@/data/org'
import { fmtDate, iso } from '@/shared/lib/format'
import { orderChipKind, deliveryOf } from '@/domain/orders/orderState'
import { now } from '@/shared/lib/clock'
import { atRiskCount, openCount, pastDue, stageCounts } from '@/domain/orders/orderCounts'
import { receivedOn } from '@/domain/orders/received'
import { curStageOf } from '@/domain/assignment/sla'
import { ONTIMETARGET, onTime30, whereTheTimeWent, type OnTime } from '@/domain/orders/metrics'
import { useDeliveries } from '@/shared/hooks/useDeliveries'
import { celebrationsWithin } from '@/domain/people/celebrations'
import { SkeletonValue } from '@/shared/ui/Skeleton'
import { TeamWishes } from '@/shared/ui/Wishes'
import { statusColour, statusName, useStatuses } from '@/domain/company/statuses'
import { useStaff } from '@/domain/people/roster'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { Note } from '@/shared/ui/Layout'

const COLS = '40px 130px 110px 1.4fr 150px 190px 130px'
const MIN_W = 975

const clickToSee = <span style={{ fontSize: 'var(--t-mini)' }}> · click to see</span>

function onTimeBody(ot: OnTime, stageName: (k: string) => string) {
  if (ot.pct === null) {
    return (
      <Note size="body" margin={0}>
        Nothing has been delivered in the last thirty days, so there is no percentage to state.
      </Note>
    )
  }
  const ranked = whereTheTimeWent(ot.rows)
  const gap = ot.pct - ONTIMETARGET
  return (
    <>
      <Rows>
        <Row
          title="Delivered inside the promise"
          detail="over the last thirty days"
          right={<span className="mono ok">{ot.total - ot.late}</span>}
        />
        <Row
          title="Delivered late"
          detail="the client was owed an explanation for each"
          right={<span className={`mono ${ot.late ? 'bad' : 'ok'}`}>{ot.late}</span>}
        />
        <Row
          title="Against a target of"
          detail={`${ONTIMETARGET}%`}
          right={<span className={`mono ${gap < 0 ? 'bad' : 'ok'}`}>{gap.toFixed(1)} pts</span>}
        />
      </Rows>
      {ranked.length ? (
        <>
          <SectionHead>Where the time went</SectionHead>
          <Rows>
            {ranked.map(([stage, n]) => (
              <Row
                key={stage}
                title={stageName(stage)}
                detail="the stage that took longest on a late order"
                right={
                  <span className={`mono ${n > ot.late / 3 ? 'bad' : 'gr'}`}>
                    {n} order{n === 1 ? '' : 's'}
                  </span>
                }
              />
            ))}
          </Rows>
        </>
      ) : null}
      <Note top={12}>
        The percentage is worked out from the deliveries themselves, not stored. If one stage
        dominates the list above, that is a budget or staffing problem rather than a person problem.
      </Note>
    </>
  )
}

function Dashboard() {
  const staff = useStaff()
  const { tenant } = useSession()
  const { openModal, closeModal } = useUi()
  const navigate = useGo()
  const [pipe, setPipe] = useState<string | null>(null)

  const orders = useOrders()
  const overdue = pastDue()
  const atRisk = atRiskCount()
  const open = openCount()

  const counts = stageCounts(orders)
  const shown = pipe ? orders.filter((o) => o.stt === pipe) : overdue

  const history = useDeliveries()
  const ot = useMemo(() => onTime30(history.data ?? []), [history.data])
  const otLoading = history.isPending
  const wishes = celebrationsWithin(staff, now(), 7)

  const unassigned = openExceptions().length
  const statuses = useStatuses()
  const stageName = useStageName()
  const st = (k: string) => statusName(k, statuses)
  const stColor = (k: string) => statusColour(k, statuses) ?? 'var(--ink)'
  const openOnTime = () =>
    openModal({
      title:
        ot.pct === null
          ? 'On-time delivery'
          : `On time — ${ot.pct.toFixed(1)}% of ${ot.total} deliveries`,
      body: onTimeBody(ot, stageName),
      footer: (
        <>
          {ot.pct === null ? null : (
            <Btn
              variant="ghost"
              onClick={() => {
                closeModal()
                navigate({ to: '/reports', search: { tab: 'Turnaround' } })
              }}
            >
              Turnaround report
            </Btn>
          )}
          <Btn onClick={closeModal}>Close</Btn>
        </>
      ),
    })

  const openRow = (id: string) => navigate({ to: '/orders/$orderId', params: { orderId: id } })

  const received = receivedOn(orders, iso(now()))
  const delivered = received.filter((o) => !curStageOf(o)).length
  const moving = received.length - delivered
  const unplaced = unassigned
  const today = new Set(received.map((o) => o.id))
  const earlier = orders.filter((o) => !o.done && !today.has(o.id)).length

  return (
    <>
      <PageHead
        title="Dashboard"
        sub={`Everything live in ${tenant.name} right now.`}
        actions={
          <>
            <Btn variant="ghost" onClick={() => navigate({ to: '/reports' })}>
              Reports
            </Btn>
            <Btn onClick={() => navigate({ to: '/orders/new' })}>＋ New order</Btn>
          </>
        }
      />

      <Kpis>
        <Kpi
          title="Past due"
          icon="▲"
          value={overdue.length}
          tone={overdue.length ? 'alert' : undefined}
          detail={overdue.length ? 'client already owed an explanation' : 'nothing overdue'}
          detailTone={overdue.length ? 'bad' : 'ok'}
          chevron
          hint="The orders that are already late"
          onClick={() => navigate({ to: '/orders', search: { pill: 'late' } })}
        />
        <Kpi
          title="Due within 4h"
          icon="◷"
          value={atRisk}
          tone={atRisk ? 'warn' : undefined}
          detail="act now to stay on time"
          detailTone="warn"
          chevron
          hint="The orders with less than four hours left"
          onClick={() => navigate({ to: '/orders', search: { pill: 'soon' } })}
        />
        <Kpi
          title="Open orders"
          icon="☰"
          value={open}
          detail={earlier ? `${open - earlier} from today, ${earlier} from earlier days` : `across ${STAGES.length} stages`}
          chevron
          hint="Everything still moving"
          onClick={() => navigate({ to: '/orders', search: { pill: 'all' } })}
        />
        <Kpi
          title="Unassigned stages"
          icon="⇄"
          value={unassigned}
          detail="nobody picked them up"
          chevron
          hint="Where the engine could not place them"
          onClick={() => navigate({ to: '/assign' })}
        />
        <Kpi
          title="On time · 30d"
          icon="✓"
          value={otLoading ? <SkeletonValue /> : ot.pct === null ? '—' : ot.pct.toFixed(1) + '%'}
          tone={!otLoading && ot.pct !== null && ot.pct < ONTIMETARGET ? 'warn' : undefined}
          detail={`target ${ONTIMETARGET}%`}
          detailTone={ot.pct !== null && ot.pct < ONTIMETARGET ? 'warn' : 'ok'}
          chevron
          hint="What was late, and where it went over"
          onClick={otLoading ? undefined : openOnTime}
        />
      </Kpis>

      <SectionHead>Pipeline — click a stage to filter</SectionHead>
      <div className="pipe">
        {statuses.map(([k]) => {
          const n = counts[k] ?? 0
          return (
            <Press
              key={k}
              className={`pchip ${pipe === k ? 'on' : ''} ${n ? '' : 'zero'}`}
              aria-pressed={pipe === k}
              label={`${st(k)} ${n}`}
              onClick={() => setPipe(pipe === k ? null : k)}
            >
              <span className="dt" style={{ background: stColor(k) }} />
              {st(k)}
              <span className="n">{n}</span>
            </Press>
          )
        })}
      </div>

      <SectionHead>
        {pipe
          ? `${st(pipe)} — ${shown.length} order${shown.length === 1 ? '' : 's'}`
          : 'Past due — needs attention first'}
      </SectionHead>

      {shown.length ? (
        <FlexTable
          cols={COLS}
          min={MIN_W}
          head={['#', 'Order', 'Product', 'Property', 'Stage', 'Due', 'Age in stage']}
          wrap="tbl"
        >
          {shown.map((o, oi) => (
            <FlexRow key={o.id} onClick={() => openRow(o.id)}>
              <Cell>
                <div className="gr mono" style={{ fontSize: 'var(--t-label)' }}>
                  {oi + 1}
                </div>
              </Cell>
              <Cell>
                <div className="v mono">{o.id}</div>
                <div className="s">{o.cl}</div>
              </Cell>
              <Cell>
                <div className="v">{o.pr}</div>
              </Cell>
              <Cell>
                <div className="v">{o.prop}</div>
                <div className="s">
                  {o.co}, {o.st}
                </div>
              </Cell>
              <Cell>
                <Chip kind={orderChipKind(o)}>{st(o.stt)}</Chip>
              </Cell>
              <Cell>
                <Due at={o.due} sent={deliveryOf(o)} />
              </Cell>
              <Cell>
                <div className="v" style={{ fontSize: 'var(--t-small)' }}>
                  {o.age.replace(/ in (.+)$/, (_, s: string) => ` in ${stageName(s)}`)}
                </div>
                {o.flag ? <div className="s bad">{o.flag}</div> : null}
              </Cell>
            </FlexRow>
          ))}
        </FlexTable>
      ) : (
        <div className="tbl">
          <Empty icon="✓">
            {pipe ? `Nothing in ${st(pipe)} right now.` : 'Nothing past due. The board is clean.'}
          </Empty>
        </div>
      )}

      {wishes.length ? (
        <>
          <SectionHead>Worth a word</SectionHead>
          <TeamWishes celebrations={wishes} title="Birthdays and anniversaries this week" />
        </>
      ) : null}

      <SectionHead>Today</SectionHead>
      <Kpis>
        <Kpi
          title="Received"
          value={received.length}
          detail={
            <>
              {fmtDate(now())} · every client{clickToSee}
            </>
          }
          hint="Open the detail"
          onClick={() => navigate({ to: '/reports', search: { tab: 'Received' } })}
        />
        <Kpi
          title="Delivered"
          value={<span className="ok">{delivered}</span>}
          detail={<>through every department{clickToSee}</>}
          hint="Open the detail"
          onClick={() => navigate({ to: '/reports', search: { tab: 'Received', focus: 'done' } })}
        />
        <Kpi
          title="Still moving"
          value={<span className="warn">{moving}</span>}
          tone="warn"
          detail={<>of today’s {received.length}, still in the pipeline{clickToSee}</>}
          hint="Open the detail"
          onClick={() => navigate({ to: '/reports', search: { tab: 'Received', focus: 'wip' } })}
        />
        <Kpi
          title="Could not be placed"
          value={<span className={unplaced ? 'bad' : 'ok'}>{unplaced}</span>}
          tone={unplaced ? 'alert' : undefined}
          detail={<>waiting on a person{clickToSee}</>}
          hint="Open the detail"
          onClick={() =>
            navigate({ to: '/reports', search: { tab: 'By department', focus: 'exc' } })
          }
        />
      </Kpis>
    </>
  )
}

export default function DashboardRoute() {
  return (
    <RequireCap cap="all">
      <Dashboard />
    </RequireCap>
  )
}
