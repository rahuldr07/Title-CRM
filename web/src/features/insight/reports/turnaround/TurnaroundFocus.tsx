import { useStageName } from '@/domain/company/naming'
import { useMemo } from 'react'
import { BarRow } from '@/shared/ui/Bar'
import { Card, Label } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { Press } from '@/shared/ui/Button'
import { SectionHead } from '@/shared/ui/PageHead'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { ShowAll } from '@/shared/ui/ShowAll'
import { useCappedList } from '@/shared/hooks/useCappedList'
import { hh } from '@/domain/assignment/sla'
import type { Delivery } from '@/data/deliveries'
import { FocusHead } from '@/features/insight/reports/FocusKpis'
import { DeliveryRows } from './DeliveryRows'
import { fmtDate } from '@/shared/lib/format'
import {
  outcomeList,
  overranBy,
  slowestFirst,
  spreadBuckets,
  stageOverruns,
  tightCount,
  withOverruns,
  type StageRow,
} from './deliveryStats'
import { Note } from '@/shared/ui/Layout'

export function TurnaroundOutcomeFocus({
  focus,
  d,
  onBack,
}: {
  focus: 'ontime' | 'late'
  d: Delivery[]
  onBack: () => void
}) {
  const list = useMemo(() => outcomeList(d, focus === 'late'), [d, focus])
  const tight = useMemo(() => tightCount(list), [list])
  const shown = useCappedList(list)
  const lines = useMemo(() => withOverruns(shown.shown), [shown])
  return (
    <>
      <FocusHead
        title={
          focus === 'late' ? `All ${list.length} late deliveries` : `The ${list.length} that met the promise`
        }
        onBack={onBack}
      >
        {focus === 'late'
          ? 'Worst overrun first, each attributed to the department that actually went over.'
          : 'Tightest first — the ones at the top cleared by the smallest margin and are the ones to watch.'}
      </FocusHead>
      <SectionHead>{focus === 'late' ? 'Late' : 'On time'}</SectionHead>
      <DeliveryRows lines={lines} />
      <ShowAll list={shown} noun={focus === 'late' ? 'late deliveries' : 'on-time deliveries'} />
      <Note top={10}>
        {focus === 'late'
          ? 'Attribution is by budget, not by who was holding it at the deadline.'
          : `${tight} of these cleared with less than 10% of the promise to spare. They are late deliveries that happened not to be.`}
      </Note>
    </>
  )
}

const WORST_COLS = '40px 105px 150px 130px 105px 105px 130px 1fr'
const WORST_HEAD = ['#', 'Delivered', 'Order', 'Client', 'Took', 'Budget', 'Over by', 'Outcome']

export function TurnaroundWorstFocus({
  worst,
  d,
  onBack,
  onBudgets,
}: {
  worst: StageRow
  d: Delivery[]
  onBack: () => void
  onBudgets: () => void
}) {
  const stageName = useStageName()
  const items = useMemo(() => stageOverruns(d, worst.st), [d, worst.st])
  const whoBy = useMemo(() => overranBy(items, worst.st), [items, worst.st])
  const peak = Math.max(1, ...Object.values(whoBy))
  const shown = useCappedList(items)
  return (
    <>
      <FocusHead title={`${stageName(worst.st)} went over budget on ${items.length} of ${d.length} deliveries`} onBack={onBack}>
        That is {worst.overPct}% — far enough above the other departments that it is worth asking
        whether the budget is right before asking anything of the people.
      </FocusHead>
      <Card padded top={14}>
        <Label>Who was on those stages</Label>
        {Object.entries(whoBy)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([n, c]) => (
            <BarRow
              key={n}
              cols="190px 1fr 70px"
              padding="5px 0"
              labelClass=""
              label={n}
              value={c}
              max={peak}
              color="var(--warn)"
              rightClass="mono gr"
              right={c}
            />
          ))}
        <Note top={12}>
          Spread across the whole department, which is the signature of a budget that is too tight
          rather than a person who is too slow.{' '}
          <Press className="br" style={{ fontWeight: 600 }} onClick={onBudgets}>
            Adjust the split
          </Press>
        </Note>
      </Card>
      <SectionHead>Every {stageName(worst.st)} overrun, worst first</SectionHead>
      <FlexTable cols={WORST_COLS} min={920} head={WORST_HEAD}>
        {shown.shown.map((i, ii) => (
          <FlexRow cols={WORST_COLS} key={i.x.id}>
            <Cell v={ii + 1} mono tone="gr" />
            <Cell v={fmtDate(i.x.d)} mono />
            <Cell v={i.x.id} mono s={i.x.pr} />
            <Cell v={i.x.cl} />
            <Cell v={hh(i.h)} mono tone="warn" />
            <Cell v={hh(i.c)} mono tone="gr" />
            <Cell v={`${i.ratio.toFixed(2)}×`} mono tone={i.ratio > 2 ? 'bad' : 'warn'} />
            <Cell>{i.x.late ? <Chip kind="d">Delivered late</Chip> : <Chip kind="v">Absorbed</Chip>}</Cell>
          </FlexRow>
        ))}
      </FlexTable>
      <ShowAll list={shown} noun={`${stageName(worst.st)} overruns`} />
      <Note top={10}>
        {items.filter((i) => !i.x.late).length} of these were absorbed by the buffer and the other
        departments. Overrunning is not the same as being late — but it spends the slack that covers
        everything else.
      </Note>
    </>
  )
}

export function TurnaroundSpreadFocus({
  d,
  med,
  avg,
  onBack,
}: {
  d: Delivery[]
  med: number
  avg: number
  onBack: () => void
}) {
  const slowest = useMemo(() => slowestFirst(d), [d])
  const shown = useCappedList(slowest)
  const lines = useMemo(() => withOverruns(shown.shown), [shown])
  return (
    <>
      <FocusHead title={`How the ${d.length} turnarounds are spread`} onBack={onBack}>
        A median of {hh(med)} against a mean of {hh(avg)}. When the mean sits above the median, a
        small number of very slow orders is pulling it — those are the ones worth reading.
      </FocusHead>
      <Card padded top={14}>
        <Label>Turnaround as a share of the promise</Label>
        {spreadBuckets(d).map((b) => (
          <BarRow
            key={b.label}
            cols="190px 1fr 110px"
            label={b.label}
            value={b.n}
            max={d.length}
            color={b.over ? 'var(--warn)' : 'var(--ok)'}
            right={
              <>
                {b.n} · {Math.round((b.n / d.length) * 100)}%
              </>
            }
          />
        ))}
        <Note top={12}>
          Measured against each order's own promise, so a 48-hour full search and a 4-hour rush can
          sit in the same bar.
        </Note>
      </Card>
      <SectionHead>Slowest first</SectionHead>
      <DeliveryRows lines={lines} />
      <Note top={10}>
        Ordered by share of the promise used.
      </Note>
      <ShowAll list={shown} noun="deliveries" />
    </>
  )
}
