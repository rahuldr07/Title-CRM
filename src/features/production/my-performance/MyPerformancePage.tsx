import { useStageName } from '@/domain/company/naming'
import { useState } from 'react'
import { useGo } from '@/shared/hooks/useGo'
import { useOrders } from '@/domain/orders/orders'
import { dayLoadOf } from '@/domain/orders/dayLoad'
import { Banner } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Card, Label } from '@/shared/ui/Card'
import { Kpi, Kpis } from '@/shared/ui/Kpi'
import { PageHead } from '@/shared/ui/PageHead'
import { focusSection } from '@/shared/ui/focus'
import { RangeBar } from '@/shared/ui/RangeBar'
import { SkeletonRows, SkeletonValue } from '@/shared/ui/Skeleton'
import { useBudgetHelp } from '@/shared/hooks/useBudgetHelp'
import { useSession } from '@/domain/auth/SessionProvider'
import { useUi } from '@/shared/ui/UiProvider'
import { QC_CRITERIA, qcAverage, reasonCounts } from '@/domain/quality/quality'
import { useQcRules } from '@/domain/quality/qcRules'
import { DEFAULT_RANGE, inRange, resolveRange, type RangeState } from '@/shared/lib/range'
import { useDeliveries } from '@/shared/hooks/useDeliveries'
import { useQcLog } from '@/shared/hooks/useQcLog'
import { useStageWork } from '@/shared/hooks/useStageWork'
import { useStaff } from '@/domain/people/roster'
import { WeeklyChart } from './WeeklyChart'
import { ChecksDetail, HabitsDetail } from './PerformanceDetails'
import { HabitCards } from './HabitCards'
import { OneOffs } from './OneOffs'
import { CriteriaCard } from './CriteriaCard'
import { TimingCard } from './TimingCard'
import { DepartmentFaults } from './DepartmentFaults'
import { weeklyAverages } from './weekly'
import { scoreSpread } from './performance'
import { Note } from '@/shared/ui/Layout'

export default function MyPerformance() {
  const everyone = useStaff()
  const { me, can } = useSession()
  const stageName = useStageName()
  const { openModal } = useUi()
  const navigate = useGo()
  const budgetHelp = useBudgetHelp()
  const qcLog = useQcLog()
  const orders = useOrders()
  const history = useDeliveries()
  const [rangeState, setRangeState] = useState<RangeState>(DEFAULT_RANGE)

  const range = resolveRange(rangeState)
  const log = qcLog.data ?? []
  const rows = log.filter((x) => x.onName === me.n && inRange(x.d, range))
  const loading = qcLog.isPending || history.isPending
  const stageWork = useStageWork(range)

  const allowed = useQcRules().find((r) => r.k === 'see')?.on ?? false

  if (!allowed) {
    return (
      <>
        <PageHead title="How I’m doing" />
        <Card padded style={{ maxWidth: 620 }}>
          <Banner
            kind="r"
            icon="⚿"
            title="Ratings are not shown to the person rated on this account"
            margin={0}
          >
            That is a company setting, not something about you. An admin turns it on under{' '}
            <b>Reports → Quality → How scoring works</b>, the rule “Scores are visible to the person
            rated”.
          </Banner>
          <Note top={12}>
            Measuring someone against something they cannot see is the fastest way to make a quality
            score resented rather than useful — worth saying to whoever owns that setting.
          </Note>
        </Card>
      </>
    )
  }

  const below = rows.filter((x) => x.crit)
  const clean = rows.length - below.length
  const ranked = reasonCounts(below)
  const habits = ranked.filter(([, n]) => n > 1)
  const oneOffs = ranked.filter(([, n]) => n === 1)
  const mineAvg = qcAverage(rows)

  const weeks = weeklyAverages(rows, range.from, range.to)
  const chartedWeeks = weeks.filter((w) => w.avg !== null).length

  const t = stageWork.people[me.n] ?? null

  const half = new Date((range.from.getTime() + range.to.getTime()) / 2)
  const recent = below.filter((x) => x.d >= half)
  const older = below.filter((x) => x.d < half)

  const axes = QC_CRITERIA.map(([name, field]) => ({
    name,
    n: below.filter((x) => x.crit === name).length,
    avg: rows.length ? rows.reduce((a, x) => a + x[field], 0) / rows.length : null,
  }))
  const strongest = rows.length ? axes.filter((a) => a.n === 0) : []

  const spread = scoreSpread(log)

  const showHabits = () =>
    openModal({
      title: `Came up more than once — ${habits.length}`,
      body: <HabitsDetail habits={habits} />,
    })

  const showChecks = (kind: 'all' | 'clean') => {
    const list = kind === 'clean' ? rows.filter((x) => !x.crit) : rows
    openModal({
      title:
        kind === 'clean'
          ? `Nothing raised — ${list.length}`
          : `Every check — ${list.length} · ${range.label}`,
      body: <ChecksDetail list={list} />,
    })
  }

  const dept = me.dep[0]
  const deptTop = dept
    ? reasonCounts(
        log.filter(
          (x) =>
            inRange(x.d, range) &&
            everyone.some((s) => s.n === x.onName && s.dep.includes(dept)),
        ),
      ).slice(0, 4)
    : []

  const today = dayLoadOf(me, orders)

  return (
    <>
      <PageHead
        title="How I’m doing"
        sub={`${me.dep.map(stageName).join(' · ') || 'no department'} · ${range.label}`}
        actions={
          <Btn onClick={() => navigate({ to: '/staff/$personId', params: { personId: me.id } })}>
            My profile
          </Btn>
        }
      />

      <RangeBar
        id="mf"
        value={rangeState}
        onChange={setRangeState}
        note="these figures follow it"
      />

      <Kpis>
        <Kpi
          title="Today"
          value={
            <span className={today.done >= me.cap ? 'ok' : undefined}>
              {today.done} of {me.cap}
            </span>
          }
          detail={today.onDesk ? `stages done · ${today.onDesk} still in your queue` : 'stages done · queue clear'}
          chevron
          hint="Your queue"
          onClick={() => navigate({ to: '/mywork' })}
        />
        <Kpi
          title="Your score"
          value={
            qcLog.isPending ? (
              <SkeletonValue />
            ) : mineAvg !== null ? (
              <span className="ok">{mineAvg.toFixed(2)}</span>
            ) : (
              '—'
            )
          }
          detail={
            mineAvg === null || !spread
              ? 'out of 5'
              : mineAvg < spread.lo
                ? 'out of 5 — just below the usual range here'
                : mineAvg > spread.hi
                  ? 'out of 5 — at the top of the range here'
                  : 'out of 5 — in line with everyone here'
          }
          hint={
            spread
              ? `Everyone here averages ${spread.lo.toFixed(2)} to ${spread.hi.toFixed(2)} across the full log`
              : 'The average of every rating in range'
          }
          chevron
          onClick={() => showChecks('all')}
        />
        <Kpi
          title="Work checked"
          value={qcLog.isPending ? <SkeletonValue /> : rows.length}
          detail="pieces of your work a colleague reviewed"
          chevron
          hint="Every check in range"
          onClick={() => showChecks('all')}
        />
        <Kpi
          title="No issues found"
          value={qcLog.isPending ? <SkeletonValue /> : <span className="ok">{clean}</span>}
          detail={`${rows.length ? Math.round((clean / rows.length) * 100) : 0}% of the checks`}
          chevron
          hint="The ones with nothing raised"
          onClick={() => showChecks('clean')}
        />
        <Kpi
          title="Keeps happening"
          value={
            qcLog.isPending ? (
              <SkeletonValue />
            ) : (
              <span className={habits.length ? 'warn' : 'ok'}>{habits.length}</span>
            )
          }
          tone={habits.length ? 'warn' : undefined}
          detail={habits.length ? 'the same issue more than once' : 'nothing came up twice'}
          chevron
          hint="The ones worth changing a habit for"
          onClick={showHabits}
        />
        <Kpi
          title="Finished in time"
          value={history.isPending ? <SkeletonValue /> : t ? `${t.onBudget}%` : '—'}
          valueTone={t ? (t.vsPeers >= -5 ? 'ok' : 'warn') : undefined}
          tone={t && t.vsPeers < -5 ? 'warn' : undefined}
          detail={t ? `of your work — others doing the same: ${t.expected}%` : 'no timed work in range'}
          chevron
          hint="How often you finish inside the time allowed for the stage"
          onClick={can('assign') && dept ? () => focusSection('mfDept') : budgetHelp}
        />
      </Kpis>

      <Card padded top={16}>
        <Label>Your score, week by week</Label>
        {chartedWeeks > 1 ? (
          <>
            <WeeklyChart weeks={weeks} />
            <Note top={6}>
              Weekly average against the full 0–5 scale, so a flat line near the top means the
              scale is not finding much to disagree about — not that nothing happened.
            </Note>
          </>
        ) : (
          <Note margin={0}>
            Not enough checks spread across separate weeks yet to show a trend — widen the range.
          </Note>
        )}
      </Card>

      {loading ? (
        <Card top={16}>
          <div className="cb">
            <SkeletonRows rows={4} cols={3} />
          </div>
        </Card>
      ) : (
        <>
          <HabitCards
            habits={habits}
            below={below}
            recent={recent}
            older={older}
            checked={rows.length}
            rangeLabel={range.label}
          />

          {oneOffs.length ? <OneOffs oneOffs={oneOffs} below={below} /> : null}

          <div className="two" style={{ marginTop: 18 }}>
            <CriteriaCard axes={axes} strongest={strongest} raised={below.length} checked={rows.length} />
            <TimingCard t={t} />
          </div>

          {can('assign') && dept ? <DepartmentFaults dept={dept} top={deptTop} /> : null}
        </>
      )}
    </>
  )
}
