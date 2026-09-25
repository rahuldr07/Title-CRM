import { useStageName } from '@/domain/company/naming'
import { useMemo, useState } from 'react'
import { useGo, useMayOpen } from '@/shared/hooks/useGo'
import { Btn } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Empty } from '@/shared/ui/Banner'
import { turnaroundCsv } from '@/features/insight/reports/reportCsv'
import { useReportExport } from '@/features/insight/reports/reportExport'
import { FocusKpis } from '@/features/insight/reports/FocusKpis'
import { RangeBar } from '@/shared/ui/RangeBar'
import { DEFAULT_RANGE, inRange, resolveRange, type RangeState } from '@/shared/lib/range'
import { ONTIMETARGET } from '@/domain/orders/metrics'
import { median } from '@/shared/lib/stats'
import { hh } from '@/domain/assignment/sla'
import type { Delivery } from '@/data/deliveries'
import { stageRows } from './deliveryStats'
import { TurnaroundOutcomeFocus, TurnaroundSpreadFocus, TurnaroundWorstFocus } from './TurnaroundFocus'
import { TurnaroundOverview } from './TurnaroundOverview'

export function Turnaround({ deliveries }: { deliveries: Delivery[] }) {
  const navigate = useGo()
  const stageName = useStageName()
  const [range, setRange] = useState<RangeState>(DEFAULT_RANGE)
  const [focus, setFocus] = useState('all')

  const toBudgets = () => navigate({ to: '/company', search: { tab: 'Turnaround & SLA' } })
  const mayOpenCompany = useMayOpen('company')

  const r = useMemo(() => resolveRange(range), [range])
  const d = useMemo(() => deliveries.filter((x) => inRange(x.d, r)), [deliveries, r])
  useReportExport(() => turnaroundCsv(d))

  const stages = useMemo(() => stageRows(d), [d])

  if (!d.length) {
    return (
      <>
        <RangeBar id="t" value={range} onChange={setRange} showCustom={false} />
        <Card>
          <Empty
            icon="◷"
            action={
              <Btn small onClick={() => setRange({ preset: '30' })}>
                Back to the last 30 days
              </Btn>
            }
          >
            Nothing was delivered in this range.
          </Empty>
        </Card>
      </>
    )
  }

  const late = d.filter((x) => x.late)
  const onTime = d.length - late.length
  const pct = Math.round((onTime / d.length) * 1000) / 10
  const avg = d.reduce((a, x) => a + x.hrs, 0) / d.length
  const med = median(d.map((x) => x.hrs))
  const totMed = stages.reduce((a, x) => a + x.med, 0) || 1
  stages.forEach((x) => (x.share = Math.round((x.med / totMed) * 100)))
  const worst = [...stages].sort((a, b) => b.overPct - a.overPct)[0]
  const back = () => setFocus('all')

  return (
    <>
      <RangeBar id="t" value={range} onChange={setRange} showCustom={false} />

      <FocusKpis
        focus={focus}
        onFocus={setFocus}
        cards={[
          {
            key: 'ontime',
            title: 'On time',
            value: <span className={pct >= ONTIMETARGET ? 'ok' : 'warn'}>{pct}%</span>,
            tone: pct < ONTIMETARGET ? 'warn' : undefined,
            detail: `target ${ONTIMETARGET}%`,
            count: onTime,
          },
          {
            key: 'late',
            title: 'Late',
            value: <span className={late.length ? 'bad' : 'ok'}>{late.length}</span>,
            tone: late.length ? 'alert' : undefined,
            detail: `of ${d.length} delivered`,
            count: late.length,
          },
          {
            key: 'spread',
            title: 'Median turnaround',
            value: <span className="mono" style={{ fontSize: 'var(--t-h1)' }}>{hh(med)}</span>,
            detail: `mean ${hh(avg)}`,
            count: d.length,
          },
          ...(worst
            ? [
                {
                  key: 'worst',
                  title: 'Worst stage',
                  value: <span style={{ fontSize: 'var(--t-h2)' }}>{stageName(worst.st)}</span>,
                  detail: <span className="warn">over budget on {worst.overPct}%</span>,
                  count: worst.over,
                },
              ]
            : []),
        ]}
      />

      {focus === 'ontime' || focus === 'late' ? <TurnaroundOutcomeFocus focus={focus} d={d} onBack={back} /> : null}

      {focus === 'worst' && worst ? (
        <TurnaroundWorstFocus worst={worst} d={d} onBack={back} onBudgets={toBudgets} />
      ) : null}

      {focus === 'spread' ? <TurnaroundSpreadFocus d={d} med={med} avg={avg} onBack={back} /> : null}

      {focus === 'all' ? (
        <TurnaroundOverview
          d={d}
          late={late}
          stages={stages}
          worst={worst}
          totMed={totMed}
          pct={pct}
          med={med}
          mayOpenCompany={mayOpenCompany}
          onBudgets={toBudgets}
        />
      ) : null}
    </>
  )
}
