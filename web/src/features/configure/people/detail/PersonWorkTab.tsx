import { useStageName } from '@/domain/company/naming'
import { BarRow } from '@/shared/ui/Bar'
import { Card, Label } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { Kpi, Kpis } from '@/shared/ui/Kpi'
import { SectionHead } from '@/shared/ui/PageHead'
import { SkeletonRows, SkeletonValue } from '@/shared/ui/Skeleton'
import { AVAIL } from '@/data/people'
import { ASSIGN_STAGES } from '@/data/org'
import type { Person } from '@/data/types'
import type { DayLoad } from '@/domain/orders/dayLoad'
import { median } from '@/shared/lib/stats'
import type { StageWork } from '@/domain/quality/quality'
import { fmtHour, labelOf } from '@/shared/lib/format'
import { Note } from '@/shared/ui/Layout'

export function PersonWorkTab({
  person,
  work,
  t,
  withheld,
  loading,
  rangeLabel,
  onStages,
  onLate,
  onBudgetHelp,
  onOpenOrder,
}: {
  person: Person
  work: DayLoad
  t: StageWork | null
  withheld: string | null
  loading: boolean
  rangeLabel: string
  onStages: () => void
  onLate: () => void
  onBudgetHelp: () => void
  onOpenOrder: (orderId: string) => void
}) {
  const stageName = useStageName()
  const dayItems = [...work.items].sort((a, b) => a.hr - b.hr)

  return (
    <>
      <Kpis style={{ marginTop: 16 }}>
        <Kpi
          title="Stages today"
          value={work.given}
          detail={`${work.done} done · ${work.onDesk} open`}
          hint="Their day, stage by stage"
          onClick={onStages}
        />
        {withheld ? null : (
          <>
        <Kpi
          title="Inside budget"
          value={loading ? <SkeletonValue width={64} /> : t ? `${t.onBudget}%` : '—'}
          valueTone={t ? (t.vsPeers >= -5 ? 'ok' : 'warn') : undefined}
          tone={t && t.vsPeers < -5 ? 'warn' : undefined}
          detail={t ? `peers ${t.expected}%` : 'no history in range'}
          hint="What this is measured against"
          onClick={onBudgetHelp}
        />
        <Kpi
          title="Median time used"
          value={loading ? <SkeletonValue width={64} /> : t ? `${t.ratio.toFixed(2)}×` : '—'}
          detail="of the budget allowed"
          hint="What this is measured against"
          onClick={onBudgetHelp}
        />
        <Kpi
          title="Late orders they overran"
          value={
            loading ? (
              <SkeletonValue width={48} />
            ) : (
              <span className={t?.causedLate ? 'bad' : 'ok'}>{t ? t.causedLate : '—'}</span>
            )
          }
          tone={t?.causedLate ? 'alert' : undefined}
          detail="their stage went over"
          hint="Which orders, and by how much"
          onClick={onLate}
        />
          </>
        )}
      </Kpis>
      {withheld ? (
        <Note top={12}>
          {withheld}
        </Note>
      ) : null}

      {loading ? (
        <Card top={16}>
          <div className="cb">
            <SkeletonRows rows={4} cols={3} />
          </div>
        </Card>
      ) : t ? (
        <Card padded top={16}>
          <Label>Time against budget, by department — {rangeLabel}</Label>
          {ASSIGN_STAGES.map((st) => {
            const l = t.stages[st]
            if (!l?.length) return null
            const md = median(l.map((x) => x.ratio))
            const ov = l.filter((x) => x.over).length
            return (
              <BarRow
                key={st}
                cols="120px 1fr 200px"
                padding="7px 0"
                label={stageName(st)}
                value={md}
                max={2}
                budget={{ value: 1, max: 2 }}
                color={md > 1 ? 'var(--warn)' : 'var(--brand2)'}
                right={
                  <>
                    {md.toFixed(2)}×{' '}
                    <span className={ov / l.length > 0.3 ? 'warn' : 'gr'}>
                      · over on {ov} of {l.length}
                    </span>
                  </>
                }
              />
            )
          })}
          <Note top={12}>
            Pale bar is the budget, solid is their median. Judged against people doing the same
            stages, not against the whole company.
          </Note>
        </Card>
      ) : null}

      <SectionHead>Today, stage by stage</SectionHead>
      {dayItems.length ? (
        <FlexTable
          cols="40px 105px 160px 150px 150px 1fr"
          min={800}
          head={['#', 'Arrived', 'Order', 'Client', 'Stage', 'Status']}
        >
          {dayItems.map((i, idx) => (
            <FlexRow
              key={`${i.o.id}-${i.stage}-${idx}`}
              cols="40px 105px 160px 150px 150px 1fr"
              onClick={() => onOpenOrder(i.o.id)}
            >
              <Cell v={idx + 1} mono tone="gr" />
              <Cell v={fmtHour(i.hr)} mono />
              <Cell v={i.o.id} s={i.o.pr} mono />
              <Cell v={i.o.cl} />
              <Cell v={stageName(i.stage)} />
              <Cell>
                <Chip kind={i.fin ? 'v' : 'r'}>{i.fin ? 'Completed' : 'On their desk'}</Chip>
              </Cell>
            </FlexRow>
          ))}
        </FlexTable>
      ) : (
        <Card padded>
          <Note margin={0}>
            Nothing assigned today.
            {person.avail !== 'ok'
              ? ` They are ${labelOf(AVAIL, person.avail)[0].toLowerCase()}.`
              : ' The engine had work but did not need them.'}
          </Note>
        </Card>
      )}
    </>
  )
}
