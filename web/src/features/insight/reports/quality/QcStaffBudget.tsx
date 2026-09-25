import { useStageName } from '@/domain/company/naming'
import { BarRow } from '@/shared/ui/Bar'
import { Card } from '@/shared/ui/Card'
import { SectionHead } from '@/shared/ui/PageHead'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { ASSIGN_STAGES } from '@/data/org'
import { median } from '@/shared/lib/stats'
import { hh } from '@/domain/assignment/sla'
import type { StageWork } from '@/domain/quality/quality'
import { fmtDate } from '@/shared/lib/format'
import { Note } from '@/shared/ui/Layout'

const LATE_COLS = '40px 120px 140px 130px 130px 1fr'

export function QcStaffBudget({ t }: { t: StageWork }) {
  const stageName = useStageName()
  return (
    <>
      <SectionHead>Time against the budget, department by department</SectionHead>
      <Card padded>
        <Note margin="0 0 14px">
          Their own stages only. The budget is whatever Stage budgets allows that department on that
          product, so a 40-year search is judged against a 40-year search budget.
        </Note>
        {ASSIGN_STAGES.map((st) => {
          const list = t.stages[st]
          if (!list?.length) return null
          const m = median(list.map((x) => x.ratio))
          const ov = list.filter((x) => x.over).length
          return (
            <BarRow
              key={st}
              cols="118px 1fr 190px"
              padding="7px 0"
              label={stageName(st)}
              value={m}
              max={2}
              budget={{ value: 1, max: 2 }}
              color={m > 1 ? 'var(--warn)' : 'var(--brand2)'}
              right={
                <>
                  {m.toFixed(2)}× budget
                  <span className={ov / list.length > 0.3 ? 'warn' : 'gr'}>
                    {' '}
                    · over on {ov} of {list.length}
                  </span>
                </>
              }
            />
          )
        })}
        <Note top={12}>
          The pale bar is the budget, the solid bar is their median.{' '}
          {t.erratic
            ? `Their typical order is fine — a median of ${t.ratio.toFixed(2)}× — but they only land inside budget ${t.onBudget}% of the time against ${t.expected}% for their peers. That is a spread problem, not a speed problem: most orders are quick and a few run long. Worth finding out what the long ones have in common before treating it as pace.`
            : t.ratio > 1.05
              ? `They run at ${t.ratio.toFixed(2)}× the time allowed, and land inside budget ${t.onBudget}% of the time against ${t.expected}% for peers doing the same stages — so this is not explained by the work they happen to get.`
              : t.vsPeers >= 5
                ? `They beat their peers by ${t.vsPeers} points on the same stages. Worth checking the defect count before calling that a good thing — speed bought with skipped checks is not speed.`
                : `They track the budget closely, and sit within ${Math.abs(t.vsPeers)} point${Math.abs(t.vsPeers) === 1 ? '' : 's'} of what peers on the same stages manage.`}
        </Note>
      </Card>

      {t.causedLate ? (
        <>
          <SectionHead>Late deliveries where their stage overran</SectionHead>
          <FlexTable
            cols={LATE_COLS}
            min={800}
            head={['#', 'Delivered', 'Order', 'Stage', 'Took', 'Against a budget of']}
          >
            {t.items
              .filter((x) => x.over && x.d.late)
              .slice(0, 10)
              .map((x, i) => (
                <FlexRow cols={LATE_COLS} key={`${x.d.id}-${x.st}-${i}`}>
                  <Cell v={i + 1} mono tone="gr" />
                  <Cell v={fmtDate(x.d.d)} mono />
                  <Cell v={x.d.id} mono s={`${x.d.cl} · ${x.d.pr}`} />
                  <Cell v={stageName(x.st)} />
                  <Cell v={hh(x.h)} mono tone="warn" />
                  <Cell>
                    <div className="v mono" style={{ fontSize: 'var(--t-small)' }}>
                      {hh(x.budget)}{' '}
                      <span className={x.ratio > 2 ? 'bad' : 'warn'}>· {x.ratio.toFixed(1)}×</span>
                    </div>
                  </Cell>
                </FlexRow>
              ))}
          </FlexTable>
          <Note top={10}>
            An order can be late without this list growing — a stage that stayed inside its budget is not
            the reason the order missed.
          </Note>
        </>
      ) : null}
    </>
  )
}
