import { useStageName } from '@/domain/company/naming'
import { useState } from 'react'
import { useGo } from '@/shared/hooks/useGo'
import { Avatar } from '@/shared/ui/Avatar'
import { Banner } from '@/shared/ui/Banner'
import { Bar } from '@/shared/ui/Bar'
import { Btn } from '@/shared/ui/Button'
import { Select } from '@/shared/ui/Controls'
import { Kpi, Kpis } from '@/shared/ui/Kpi'
import { EmbedHead, SectionHead } from '@/shared/ui/PageHead'
import { WorkFilter, WorkRow, WorkTable, WORKCOLS, useWorkFilter } from './WorkRows'
import { workloadCsv } from '@/features/insight/reports/reportCsv'
import { useReportExport } from '@/features/insight/reports/reportExport'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { FocusKpis } from '@/features/insight/reports/FocusKpis'
import { WorkFocus } from './WorkFocus'
import { useLiveWork } from '@/domain/orders/liveWork'
import { useStaff } from '@/domain/people/roster'
import { openExceptions, pipelineToday, useOrderState } from '@/domain/orders/orders'
import { AVAIL } from '@/data/people'
import { capacityTone } from '@/domain/orders/metrics'
import { labelOf } from '@/shared/lib/format'
import { loadOf, teamLoad, useDayLoads } from '@/domain/orders/dayLoad'
import { Inline, Note } from '@/shared/ui/Layout'

const PEOPLE_COLS = '190px 1fr 85px 85px 130px'

const FOCI = ['all', 'done', 'pend', 'exc']

export function ByDepartment({
  initial,
  initialFocus,
  onOpenStaff,
}: {
  initial?: string | undefined
  initialFocus?: string | undefined
  onOpenStaff: (id: string) => void
}) {
  const { depts, dwork } = useLiveWork()
  const loads = useDayLoads(useStaff())
  useOrderState()
  const open = openExceptions()
  const openIn = (stage: string) => open.filter((e) => e.stage === stage).length
  useReportExport(() => workloadCsv(depts, true))
  const navigate = useGo()
  const stageName = useStageName()
  const [sel, setSel] = useState(initial ?? 'all')
  const [focus, setFocus] = useState(initialFocus && FOCI.includes(initialFocus) ? initialFocus : 'all')
  const { filter, setFilter, query, setQuery, match } = useWorkFilter()

  const picker = (
    <Select
      label="Department"
      style={{ minWidth: 230 }}
      value={sel}
      onChange={setSel}
      options={[
        ['all', `All departments — ${depts.length}`],
        ...depts.map((x) => [x.d, `${stageName(x.d)} — ${x.done} done, ${x.pend} pending`] as const),
      ]}
    />
  )

  const r = sel !== 'all' ? dwork[sel] : null

  if (!r) {
    const td = depts.reduce((a, x) => a + x.done, 0)
    const tp = depts.reduce((a, x) => a + x.pend, 0)
    const tu = open.length
    const thin = depts.filter((x) => x.avail <= 1)

    return (
      <>
        <EmbedHead
          title="Department workload"
          sub={`Today's ${pipelineToday().orders.length} orders across ${depts.length} departments.`}
          actions={picker}
        />

        {thin.length ? (
          <Banner
            kind="d"
            icon="⚠"
            title={`${thin.map((x) => stageName(x.d)).join(' and ')} ${thin.length === 1 ? 'has' : 'have'} one person or none available`}
          >
            {thin.map((x) => `${stageName(x.d)}: ${x.staff.length} member${x.staff.length === 1 ? '' : 's'}, ${x.avail} available today.`).join(' ')}{' '}
            A department this thin stops the moment that person is away.
          </Banner>
        ) : null}

        <FocusKpis
          focus={focus}
          onFocus={setFocus}
          cards={[
            {
              key: 'all',
              title: 'Stage tasks today',
              value: td + tp,
              detail: `across ${depts.filter((x) => x.tot).length} active departments`,
              count: td + tp,
            },
            {
              key: 'done',
              title: 'Completed',
              value: <span className="ok">{td}</span>,
              detail: `${td + tp ? Math.round((td / (td + tp)) * 100) : 0}% of the day`,
              count: td,
            },
            {
              key: 'pend',
              title: 'Still pending',
              value: tp,
              tone: 'warn',
              detail: <span className="warn">in a queue right now</span>,
              count: tp,
            },
            {
              key: 'exc',
              title: 'Never placed',
              value: tu,
              tone: tu ? 'alert' : undefined,
              detail: (
                <span className={tu ? 'bad' : 'ok'}>{tu ? 'no one could take them' : 'none'}</span>
              ),
              count: tu,
            },
          ]}
        />

        {focus !== 'all' ? (
          <WorkFocus focus={focus} mode="dept" onBack={() => setFocus('all')} />
        ) : (
          <>
        <SectionHead>Every department — completed against pending</SectionHead>
        <FlexTable
          cols="150px 110px 1fr 85px 85px 85px 130px"
          min={1000}
          head={['Department', 'People', 'Completed / pending', 'Done', 'Pending', 'Unplaced', 'Capacity used']}
        >
          {depts.map((x) => {
            const used = teamLoad(loads, x.free)
            const cu = x.cap ? Math.round((used / x.cap) * 100) : 0
            return (
              <FlexRow
                cols="150px 110px 1fr 85px 85px 85px 130px"
                key={x.d}
                onClick={() => setSel(x.d)}
              >
                <Cell v={<b>{stageName(x.d)}</b>} s={x.auto ? undefined : 'exception branch'} />
                <Cell
                  v={
                    <>
                      {x.avail}
                      <span className="gr"> / {x.staff.length}</span>
                    </>
                  }
                  s="available"
                  mono
                />
                <Cell>
                  {x.tot ? (
                    <>
                      <div className="split">
                        <span style={{ width: `${x.pct}%`, background: 'var(--ok)' }} />
                        <span style={{ width: `${100 - x.pct}%`, background: 'var(--warn)' }} />
                      </div>
                      <div className="s">{x.pct}% complete</div>
                    </>
                  ) : (
                    <span className="gr" style={{ fontSize: 'var(--t-small)' }}>
                      not auto-assigned
                    </span>
                  )}
                </Cell>
                <Cell v={x.done || '—'} mono tone="ok" />
                <Cell v={x.pend || '—'} mono tone={x.pend ? 'warn' : 'gr'} />
                <Cell v={openIn(x.d) || '—'} mono tone={openIn(x.d) ? 'bad' : 'gr'} />
                <Cell>
                  <Bar value={used} max={x.cap} color={capacityTone(cu).fill} />
                  <div className="s">
                    {used} of {x.cap}
                  </div>
                </Cell>
              </FlexRow>
            )
          })}
        </FlexTable>
        <Note top={12}>
          {stageName('Doc Req')} shows no tasks because it is an exception branch — work only enters it when an order needs a
          document, so it is never part of the automatic pass.
        </Note>
          </>
        )}
      </>
    )
  }

  const openOrder = (orderId: string) => navigate({ to: '/orders/$orderId', params: { orderId } })
  const items = match(r.items)
  const used = teamLoad(loads, r.free)
  const cu = r.cap ? Math.round((used / r.cap) * 100) : 0

  return (
    <>
      <Btn variant="ghost" small style={{ marginBottom: 14 }} onClick={() => setSel('all')}>
        ← All departments
      </Btn>
      <EmbedHead
        title={stageName(r.d)}
        sub={`${r.staff.length} member${r.staff.length === 1 ? '' : 's'} · ${r.avail} available today · ${r.auto ? 'part of the automatic pass' : 'exception branch, assigned on demand'}`}
        actions={picker}
      />

      {r.avail <= 1 ? (
        <Banner kind="d" icon="⚠" title={`${r.avail ? 'One person' : 'Nobody'} available in ${stageName(r.d)}`}>
          {r.staff.map((s) => `${s.n} — ${labelOf(AVAIL, s.avail)[0].toLowerCase()}`).join(', ')}.{' '}
          {r.avail ? 'If they are away, this stage stops.' : 'Anything needing this stage today has nowhere to go.'}
        </Banner>
      ) : null}

      <Kpis>
        <Kpi title="Assigned today" value={r.tot} detail="" />
        <Kpi title="Completed" value={<span className="ok">{r.done}</span>} detail={`${r.pct}%`} />
        <Kpi
          title="Pending"
          value={r.pend}
          tone={r.pend ? 'warn' : undefined}
          detail={<span className={r.pend ? 'warn' : 'ok'}>{r.pend ? 'in the queue' : 'clear'}</span>}
        />
        <Kpi
          title="Never placed"
          value={openIn(r.d)}
          tone={openIn(r.d) ? 'alert' : undefined}
          detail={
            <span className={openIn(r.d) ? 'bad' : 'ok'}>
              {openIn(r.d) ? 'became exceptions' : 'none'}
            </span>
          }
        />
        <Kpi
          title="Capacity used"
          value={`${cu}%`}
          detail={
            <span className={capacityTone(cu).text}>
              {used} of {r.cap}
            </span>
          }
        />
      </Kpis>

      <SectionHead>Who is in {stageName(r.d)}</SectionHead>
      <FlexTable
        cols={PEOPLE_COLS}
        min={700}
        head={['Person', 'Completed / pending', 'Done', 'Pending', 'Load']}
      >
        {r.staff.map((s) => {
          const v = r.people[s.id] ?? { done: 0, pend: 0 }
          const tt = v.done + v.pend
          const pct = tt ? Math.round((v.done / tt) * 100) : 0
          return (
            <FlexRow key={s.id} onClick={() => onOpenStaff(s.id)}>
              <Cell>
                <Inline gap={8}>
                  <Avatar
                    name={s.n}
                    title={`Open ${s.n}`}
                    onClick={() => navigate({ to: '/staff/$personId', params: { personId: s.id } })}
                  />
                  <div className="v">{s.n}</div>
                </Inline>
                {s.avail !== 'ok' ? <div className="s bad">{labelOf(AVAIL, s.avail)[0]}</div> : null}
              </Cell>
              <Cell>
                {tt ? (
                  <div className="split">
                    <span style={{ width: `${pct}%`, background: 'var(--ok)' }} />
                    <span style={{ width: `${100 - pct}%`, background: 'var(--warn)' }} />
                  </div>
                ) : (
                  <span className="gr" style={{ fontSize: 'var(--t-small)' }}>
                    {s.avail === 'ok' ? 'nothing assigned today' : 'unavailable'}
                  </span>
                )}
              </Cell>
              <Cell>
                <div className="v mono ok">{v.done || '—'}</div>
              </Cell>
              <Cell>
                <div className={`v mono ${v.pend ? 'warn' : 'gr'}`}>{v.pend || '—'}</div>
              </Cell>
              <Cell>
                <div className="v mono">
                  {loadOf(loads, s.id)}
                  <span className="gr"> / {s.cap}</span>
                </div>
              </Cell>
            </FlexRow>
          )
        })}
      </FlexTable>

      <SectionHead>Orders at this stage</SectionHead>
      <WorkFilter
        filter={filter}
        onFilter={setFilter}
        counts={{ all: r.tot, done: r.done, pend: r.pend }}
        query={query}
        onQuery={setQuery}
        shown={items.length}
        total={r.tot}
      />
      <WorkTable
        cols={WORKCOLS.who}
        min={840}
        head={['#', 'Order', 'Owner', 'Product', 'State', 'Arrived', 'Status']}
        empty={
          items.length
            ? null
            : {
                icon: r.auto ? '✓' : '○',
                text: r.auto
                  ? `Nothing ${filter === 'done' ? 'completed' : 'pending'} in ${stageName(r.d)}.`
                  : `${stageName(r.d)} is an exception branch — work only arrives when an order needs it.`,
              }
        }
      >
        {items.map((i, idx) => (
          <WorkRow key={`${i.o.id}-${idx}`} item={i} mode="who" index={idx} onOpen={openOrder} />
        ))}
      </WorkTable>
    </>
  )
}
