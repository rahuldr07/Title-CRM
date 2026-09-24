import { useMemo, useState } from 'react'
import { useGo } from '@/lib/nav'
import { Btn, Chip, Due, Empty, Kpi, Kpis, PageHead, Row, Rows, SectionHead } from '@/components/ui'
import { RequireCap } from '@/components/RequireCap'
import { useSession } from '@/state/session'
import { useUi } from '@/state/ui'
import { openExceptions, useOrders } from '@/state/orders'
import { STAGES, STATUS } from '@/data/org'
import { TZ, fmtDate, orderChipKind } from '@/lib/format'
import { now } from '@/lib/clock'
import { atRiskCount, openCount, pastDue } from '@/lib/derived'
import { board, curStage, stageCounts } from '@/lib/engine'
import { ONTIMETARGET, onTime30, whereTheTimeWent, type OnTime } from '@/lib/metrics'
import { useDeliveries } from '@/lib/useDeliveries'
import { celebrationsWithin } from '@/lib/celebrations'
import { STAFF } from '@/data/people'
import { SkeletonValue } from '@/components/async'
import { TeamWishes } from '@/components/Wishes'

const st = (k: string) => STATUS[k]?.[0] ?? k
/* A status nobody gave a colour takes the ink token, so it follows dark mode. */
const stColor = (k: string) => STATUS[k]?.[1] ?? 'var(--ink)'

const COLS = '40px 130px 110px 1.4fr 150px 190px 130px'
/* The fixed columns, six 13px gaps and the row padding come to 864px, so the
   design's 900px floor left the address column 36px once the # column was
   added — an address broke one letter to a line and every row went tall below
   ~1100px. 975 gives it 110px, and still fits a 1280px laptop without scroll. */
const MIN_W = 975

/* The Today cards' "· click to see", as the design prints it on every card
   that opens a report. */
const clickToSee = <span style={{ fontSize: 'var(--t-micro)' }}> · click to see</span>

/* What the on-time card opens: the figure taken apart, then the stage that ran
   longest on each late delivery. The design's own onTimeDetail, including its
   way on to the Turnaround report. */
function onTimeBody(ot: OnTime) {
  if (ot.pct === null) {
    return (
      <p className="gr" style={{ fontSize: 'var(--t-body)', margin: 0 }}>
        Nothing has been delivered in the last thirty days, so there is no percentage to state.
      </p>
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
                title={stage}
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
      <p className="gr" style={{ fontSize: 'var(--t-small)', marginTop: 12 }}>
        The percentage is worked out from the deliveries themselves, not stored. If one stage
        dominates the list above, that is a budget or staffing problem rather than a person problem.
      </p>
    </>
  )
}

function Dashboard() {
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
  const wishes = celebrationsWithin(STAFF, now(), 7)

  /* The same count Assignment shows, which a hand assignment lowers. */
  const unassigned = openExceptions().length
  const { run: RUN } = board()
  const openOnTime = () =>
    openModal({
      title:
        ot.pct === null
          ? 'On-time delivery'
          : `On time — ${ot.pct.toFixed(1)}% of ${ot.total} deliveries`,
      body: onTimeBody(ot),
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

  const delivered = RUN.today.filter((o) => !curStage(o)).length
  const moving = RUN.today.filter((o) => curStage(o)).length
  const unplaced = unassigned
  const today = new Set(RUN.today.map((o) => o.id))
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
        {Object.keys(STATUS).map((k) => {
          const n = counts[k] ?? 0
          return (
            <button
              key={k}
              type="button"
              className={`pchip ${pipe === k ? 'on' : ''} ${n ? '' : 'zero'}`}
              aria-pressed={pipe === k}
              onClick={() => setPipe(pipe === k ? null : k)}
            >
              <span className="dt" style={{ background: stColor(k) }} />
              {st(k)}
              <span className="n">{n}</span>
            </button>
          )
        })}
      </div>

      <SectionHead>
        {pipe
          ? `${st(pipe)} — ${shown.length} order${shown.length === 1 ? '' : 's'}`
          : 'Past due — needs attention first'}
      </SectionHead>

      {shown.length ? (
        <div className="tbl">
          <div className="tsc">
            <div style={{ minWidth: MIN_W }}>
              <div className="trow h" style={{ gridTemplateColumns: COLS }}>
                <span>#</span>
                <span>Order</span>
                <span>Product</span>
                <span>Property</span>
                <span>Stage</span>
                <span>Due ({TZ})</span>
                <span>Age in stage</span>
              </div>
              <div className="tb">
                {shown.map((o, oi) => (
                  <div
                    key={o.id}
                    className="trow"
                    style={{ gridTemplateColumns: COLS }}
                    role="button"
                    tabIndex={0}
                    onClick={() => openRow(o.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openRow(o.id)
                      }
                    }}
                  >
                    <div className="cell">
                      <div className="gr mono" style={{ fontSize: 'var(--t-label)' }}>
                        {oi + 1}
                      </div>
                    </div>
                    <div className="cell">
                      <div className="v mono">{o.id}</div>
                      <div className="s">{o.cl}</div>
                    </div>
                    <div className="cell">
                      <div className="v">{o.pr}</div>
                    </div>
                    <div className="cell">
                      <div className="v">{o.prop}</div>
                      <div className="s">
                        {o.co}, {o.st}
                      </div>
                    </div>
                    <div className="cell">
                      <Chip kind={orderChipKind(o)}>{st(o.stt)}</Chip>
                    </div>
                    <div className="cell">
                      <Due at={o.due} />
                    </div>
                    <div className="cell">
                      <div className="v" style={{ fontSize: 'var(--t-small)' }}>
                        {o.age}
                      </div>
                      {o.flag ? <div className="s bad">{o.flag}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
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
          value={RUN.today.length}
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
          detail={<>of today’s {RUN.today.length}, still in the pipeline{clickToSee}</>}
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
