import { useStageName } from '@/domain/company/naming'
import { BarRow } from '@/shared/ui/Bar'
import { Card, Label } from '@/shared/ui/Card'
import { Press } from '@/shared/ui/Button'
import { MatrixTable, Th } from '@/shared/ui/MatrixTable'
import { SectionHead } from '@/shared/ui/PageHead'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { hh } from '@/domain/assignment/sla'
import type { Delivery } from '@/data/deliveries'
import { groupRows, worstLate, type StageRow } from './deliveryStats'
import { fmtDate } from '@/shared/lib/format'
import { Note } from '@/shared/ui/Layout'

const LATE_COLS = '40px 130px 130px 110px 120px 130px 1fr'
const LATE_HEAD = ['#', 'Delivered', 'Order', 'Promise', 'Took', 'Over by', 'Where it went']

function TurnaroundGroup({
  d,
  by,
  label,
  pct,
  late,
  med,
}: {
  d: Delivery[]
  by: 'cl' | 'pr'
  label: string
  pct: number
  late: number
  med: number
}) {
  return (
    <Card>
      <div className="ch">
        <h2>By {label}</h2>
      </div>
      <div className="tsc">
        <MatrixTable label={`Turnaround by ${label}`} min={500}>
          <thead>
            <tr>
              <Th>{label.charAt(0).toUpperCase() + label.slice(1)}</Th>
              <Th num>Delivered</Th>
              <Th num>On time</Th>
              <Th num>Late</Th>
              <Th num>Median</Th>
              <Th num>Promise</Th>
            </tr>
          </thead>
          <tbody>
            {groupRows(d, by).map((g) => (
              <tr key={g.k}>
                <td>
                  <b>{g.k}</b>
                </td>
                <td className="n">{g.delivered}</td>
                <td className={`n ${g.pct >= 95 ? 'ok' : g.pct >= 85 ? 'warn' : 'bad'}`}>{g.pct}%</td>
                <td className={`n ${g.late ? 'warn' : 'gr'}`}>{g.late || '—'}</td>
                <td className="n">{hh(g.med)}</td>
                <td className="n gr">{g.promise}h</td>
              </tr>
            ))}
            <tr>
              <td style={{ fontWeight: 700 }}>All</td>
              <td className="tot">{d.length}</td>
              <td className="tot">{pct}%</td>
              <td className="tot">{late}</td>
              <td className="tot">{hh(med)}</td>
              <td className="tot">—</td>
            </tr>
          </tbody>
        </MatrixTable>
      </div>
    </Card>
  )
}

export function TurnaroundOverview({
  d,
  late,
  stages,
  worst,
  totMed,
  pct,
  med,
  mayOpenCompany,
  onBudgets,
}: {
  d: Delivery[]
  late: Delivery[]
  stages: StageRow[]
  worst: StageRow | undefined
  totMed: number
  pct: number
  med: number
  mayOpenCompany: boolean
  onBudgets: () => void
}) {
  const stageName = useStageName()
  return (
    <>
      <Card padded top={18}>
        <Label>Where the time goes — median hours per department, against the budget it was given</Label>
        <Note margin="6px 0 14px">
          The pale bar is the budget from{' '}
          {mayOpenCompany ? (
            <Press className="br" style={{ fontWeight: 600 }} onClick={onBudgets}>
              Company → Stage budgets
            </Press>
          ) : (
            'Company → Stage budgets'
          )}
          ; the solid bar is what actually happened.
        </Note>
        {stages.map((x) => (
          <BarRow
            key={x.st}
            cols="118px 1fr 150px"
            padding="7px 0"
            label={stageName(x.st)}
            value={x.med}
            max={Math.max(totMed, 1)}
            budget={{ value: x.budget, max: Math.max(totMed, 1) }}
            color={x.overPct > 25 ? 'var(--warn)' : 'var(--brand2)'}
            right={
              <>
                {hh(x.med)} <span className="gr">of {hh(x.budget)}</span>
                <span className={x.overPct > 25 ? 'warn' : 'gr'}> · over on {x.overPct}%</span>
              </>
            }
          />
        ))}
        {worst ? (
          <Note top={12}>
            <b>{stageName(worst.st)}</b> misses its checkpoint on {worst.overPct}% of orders —{' '}
            {worst.overPct > 25
              ? 'either the budget is wrong or the department is under-resourced, and the two need telling apart before anything is fixed.'
              : 'which is within tolerance. No stage is systematically starved.'}
          </Note>
        ) : null}
      </Card>

      <div className="pair" style={{ marginTop: 18 }}>
        <TurnaroundGroup d={d} by="cl" label="client" pct={pct} late={late.length} med={med} />
        <TurnaroundGroup d={d} by="pr" label="product" pct={pct} late={late.length} med={med} />
      </div>

      {late.length ? (
        <>
          <SectionHead>The {Math.min(late.length, 12)} worst overruns</SectionHead>
          <FlexTable cols={LATE_COLS} min={860} head={LATE_HEAD}>
            {worstLate(late, 12).map(({ x, over: bad }, xi) => {
              const [top] = bad
              return (
                <FlexRow cols={LATE_COLS} key={x.id}>
                  <Cell v={xi + 1} mono tone="gr" />
                  <Cell v={fmtDate(x.d)} mono />
                  <Cell v={x.id} mono s={`${x.cl} · ${x.pr}`} />
                  <Cell v={`${x.slaH}h`} mono />
                  <Cell v={hh(x.hrs)} mono tone="bad" />
                  <Cell v={`+${hh(x.hrs - x.slaH)}`} mono tone="warn" />
                  <Cell>
                    <div className="v" style={{ fontSize: 'var(--t-small)' }}>
                      {top ? (
                        <>
                          <b>{stageName(top.st)}</b> took {hh(top.h)} against {hh(top.c)}
                          {bad.length > 1 ? <span className="gr"> +{bad.length - 1} more over</span> : null}
                        </>
                      ) : (
                        <span className="gr">no single stage — a doc request held it</span>
                      )}
                    </div>
                  </Cell>
                </FlexRow>
              )
            })}
          </FlexTable>
          <Note top={10}>
            Every late delivery is attributed to the stage that actually overran, not to whoever happened
            to be holding it at the deadline.
          </Note>
        </>
      ) : (
        <Card padded top={18}>
          <Note margin={0}>
            Nothing was late in this range.
          </Note>
        </Card>
      )}
    </>
  )
}
