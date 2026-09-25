import { useStageName } from '@/domain/company/naming'
import { useMemo, useState } from 'react'
import { useGo, useMayOpen } from '@/shared/hooks/useGo'
import { Banner, Empty } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { MatrixTable, Th } from '@/shared/ui/MatrixTable'
import { Seg } from '@/shared/ui/Tabs'
import { qualityCsv } from '@/features/insight/reports/reportCsv'
import { useReportExport } from '@/features/insight/reports/reportExport'
import { FocusKpis } from '@/features/insight/reports/FocusKpis'
import { RangeBar } from '@/shared/ui/RangeBar'
import { DEFAULT_RANGE, inRange, resolveRange, type RangeState } from '@/shared/lib/range'
import { median } from '@/shared/lib/stats'
import { averageText, ratedPeople, stageWorkOf, standing } from '@/domain/quality/quality'
import { QcTeamFocus } from './QcTeamFocus'
import { QcStaffDetail } from './QcStaffDetail'
import type { Delivery } from '@/data/deliveries'
import type { QcEntry } from '@/data/quality'
import { useStaff } from '@/domain/people/roster'
import { pressable } from '@/shared/ui/pressable'
import { QcScoringConfig } from './QcScoringConfig'
import { teamSummary, weakDepartments } from './qcStats'
import { Note } from '@/shared/ui/Layout'

export function Quality({ deliveries, log }: { deliveries: Delivery[]; log: QcEntry[] }) {
  const [sub, setSub] = useState<'The scores' | 'How scoring works'>('The scores')

  return (
    <>
      <Seg
        style={{ marginBottom: 18 }}
        value={sub}
        onChange={setSub}
        options={(['The scores', 'How scoring works'] as const).map((x) => [x, x] as const)}
      />
      {sub === 'How scoring works' ? (
        <QcScoringConfig />
      ) : (
        <Scores deliveries={deliveries} log={log} onOpenRules={() => setSub('How scoring works')} />
      )}
    </>
  )
}

function Scores({
  deliveries,
  log,
  onOpenRules,
}: {
  deliveries: Delivery[]
  log: QcEntry[]
  onOpenRules: () => void
}) {
  const everyone = useStaff()
  const navigate = useGo()
  const stageName = useStageName()
  const [range, setRange] = useState<RangeState>(DEFAULT_RANGE)
  const [focus, setFocus] = useState('all')
  const [person, setPerson] = useState<string | null>(null)

  const toBudgets = () => navigate({ to: '/company', search: { tab: 'Turnaround & SLA' } })
  const mayOpenCompany = useMayOpen('company')

  const r = resolveRange(range)
  const dels = useMemo(() => deliveries.filter((x) => inRange(x.d, r)), [deliveries, r])
  const rows = useMemo(() => log.filter((x) => inRange(x.d, r)), [log, r])
  useReportExport(() => qualityCsv(rows))

  const { opportunities, cover, overall, defects, spread } = teamSummary(dels, rows)

  const tw = useMemo(() => stageWorkOf(dels), [dels])
  const people = useMemo(() => ratedPeople(rows, tw), [rows, tw])
  const twp = Object.values(tw.people)

  if (!dels.length) {
    return (
      <>
        <RangeBar id="q" value={range} onChange={setRange} />
        <Card>
          <Empty
            icon="★"
            action={
              <Btn small onClick={() => setRange({ preset: '30' })}>
                Back to the last 30 days
              </Btn>
            }
          >
            No deliveries in this range, so there is nothing to score.
          </Empty>
        </Card>
      </>
    )
  }

  const qlo = people.length ? Math.min(...people.map((p) => p.o)) : 0
  const qhi = people.length ? Math.max(...people.map((p) => p.o)) : 0
  const vs = people.filter((p) => p.tw).map((p) => p.tw!.vsPeers)
  const outliers = people.filter((p) => p.tw && p.tw.vsPeers < -5)
  const weak = weakDepartments(tw)
  const [weakest] = weak
  const stageTotal = twp.reduce((a, x) => a + x.c, 0)

  if (person) {
    return (
      <>
        <RangeBar id="q" value={range} onChange={setRange} />
        <QcStaffDetail
          name={person}
          rows={rows}
          range={r}
          teamAvg={overall}
          people={people}
          tw={tw}
          onBack={() => setPerson(null)}
        />
      </>
    )
  }

  return (
    <>
      <RangeBar id="q" value={range} onChange={setRange} />

      <Banner
        kind="r"
        icon="★"
        title={
          spread <= 2 ? 'These scores are not separating anyone' : 'Coverage is the weak point, not the scale'
        }
        actions={
          <Btn variant="ghost" small onClick={onOpenRules}>
            How scoring works
          </Btn>
        }
      >
        {cover}% of the work in this range was rated at all, and the average is {averageText(overall)} out of 5
        {spread <= 2 ? ' with almost no spread' : ''}. A measure where everyone is near-perfect ranks nobody.
        <div className="bs">
          Making a rating mandatory before delivery, and scoring three criteria instead of one, fixes both.
        </div>
      </Banner>

      <FocusKpis
        focus={focus}
        onFocus={setFocus}
        cards={[
          {
            key: 'delivered',
            title: 'Delivered',
            value: dels.length.toLocaleString(),
            detail: r.label,
            count: dels.length,
          },
          {
            key: 'unrated',
            title: 'Rated',
            value: <span className={cover < 90 ? 'warn' : 'ok'}>{cover}%</span>,
            tone: cover < 90 ? 'warn' : undefined,
            detail: `${rows.length.toLocaleString()} of ${opportunities.toLocaleString()} checks`,
            count: rows.length,
          },
          {
            key: 'spread',
            title: 'Average score',
            value: <span className={spread <= 2 ? 'warn' : ''}>{averageText(overall)}</span>,
            detail: spread <= 2 ? 'no spread' : `${spread} distinct levels`,
            count: rows.length,
          },
          {
            key: 'defects',
            title: 'Defects logged',
            value: defects.length,
            tone: defects.length ? 'alert' : undefined,
            detail: 'a 3 or below on any criterion',
            count: defects.length,
          },
        ]}
      />

      {focus !== 'all' ? (
        <QcTeamFocus
          focus={focus}
          dels={dels}
          rows={rows}
          defects={defects}
          range={r}
          people={people}
          overall={overall}
          onBack={() => setFocus('all')}
          onOpenPerson={setPerson}
          onOpenRules={onOpenRules}
        />
      ) : null}

      {focus === 'all' ? (
        <>
          <Card top={18}>
            <div className="ch">
              <h2>By person</h2>
              <div className="r gr" style={{ fontSize: 'var(--t-small)' }}>
                {people.length} rated in this range · click a row for the detail
              </div>
            </div>
            <div className="tsc">
              <MatrixTable label="Quality by person" min={860}>
                <thead>
                  <tr>
                    <Th>Staff</Th>
                    <Th num>Rated</Th>
                    <Th num>Defects</Th>
                    <Th num>Quality</Th>
                    <Th num title="Stages of work they did in this range">
                      Stages
                    </Th>
                    <Th
                      num
                      title="How often they finished inside budget, next to what others doing the same stages manage"
                    >
                      On budget
                    </Th>
                    <Th num title="Median time taken as a multiple of the budget">
                      vs budget
                    </Th>
                    <Th>Standing</Th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((p) => {
                    const t = p.tw
                    const sd = t && overall !== null ? standing(p.o, t.vsPeers, overall) : null
                    return (
                      <tr
                        key={p.n}
                        className="clk"
                        {...pressable(() => setPerson(p.n))}
                        title={`Open ${p.n} — ratings, reasons and time against budget`}
                      >
                        <td>
                          <b>{p.n}</b>
                          {everyone.some((x) => x.n === p.n) ? null : (
                            <>
                              {' '}
                              <Chip kind="n">no longer here</Chip>
                            </>
                          )}
                        </td>
                        <td className="n">{p.c}</td>
                        <td className={`n ${p.def ? 'warn' : 'gr'}`}>{p.def || '—'}</td>
                        <td className="n">{p.o.toFixed(2)}</td>
                        <td className="n gr">{t ? t.c : '—'}</td>
                        <td
                          className={`n ${t ? (t.vsPeers >= -5 ? 'ok' : t.vsPeers >= -15 ? 'warn' : 'bad') : 'gr'}`}
                        >
                          {t ? `${t.onBudget}%` : '—'}
                          {t ? <div className="s gr">peers {t.expected}%</div> : null}
                        </td>
                        <td className={`n ${t ? (t.ratio <= 1 ? 'ok' : 'warn') : 'gr'}`}>
                          {t ? `${t.ratio.toFixed(2)}×` : '—'}
                        </td>
                        <td>
                          {sd ? <Chip kind={sd[1]}>{sd[0]}</Chip> : <span className="gr">—</span>}{' '}
                          <span className="gr">›</span>
                        </td>
                      </tr>
                    )
                  })}
                  <tr>
                    <td style={{ fontWeight: 700 }}>Everyone</td>
                    <td className="tot">{rows.length}</td>
                    <td className="tot">{defects.length}</td>
                    <td className="tot">{averageText(overall)}</td>
                    <td className="tot">{stageTotal}</td>
                    <td className="tot">
                      {stageTotal
                        ? `${Math.round(((stageTotal - twp.reduce((a, x) => a + x.over, 0)) / stageTotal) * 100)}%`
                        : '—'}
                    </td>
                    <td className="tot">{median(twp.map((x) => x.ratio)).toFixed(2)}×</td>
                    <td />
                  </tr>
                </tbody>
              </MatrixTable>
            </div>
          </Card>

          {people.length ? (
            <Banner kind="r" icon="◷" title="Neither column ranks people on its own" top={14}>
              Quality runs {qlo.toFixed(2)} to {qhi.toFixed(2)} — a spread of {(qhi - qlo).toFixed(2)}, which
              is noise. Against peers on the same stages, hit rates run {Math.min(...vs)} to +
              {Math.max(...vs)} points, and{' '}
              {outliers.length
                ? `only ${outliers.map((p) => p.n).join(' and ')} sit${outliers.length === 1 ? 's' : ''} meaningfully below.`
                : 'nobody sits meaningfully below.'}{' '}
              Raw on-budget percentages would have been unfair — somebody doing {stageName('Search')} is judged against a
              department that misses {100 - (tw.dept['Search']?.rate ?? 100)}% of the time, somebody on {stageName('RTS')}{' '}
              against one that almost never does. The peers figure corrects for that.
            </Banner>
          ) : null}

          {weakest ? (
            <Banner
              kind="d"
              icon="⚑"
              title={weak.map(([k, v]) => `${stageName(k)} is missed by everyone ${100 - v.rate}% of the time`).join(' · ')}
              actions={
                mayOpenCompany ? (
                  <Btn variant="ghost" small onClick={toBudgets}>
                    Stage budgets
                  </Btn>
                ) : undefined
              }
            >
              When a whole department misses its budget this often, it is the budget or the staffing that is
              wrong — not the people in it. No amount of coaching moves a number that everyone shares.
              <div className="bs">
                Either widen {stageName(weakest[0])}'s share of the clock, or put more people in it.
              </div>
            </Banner>
          ) : null}

          <Note top={10}>
            Every figure is computed from the {rows.length.toLocaleString()} ratings in range, so the table
            and the four cards above cannot disagree. Somebody who has left the company still appears against
            the work they did — the name is recorded on the rating, not looked up afterwards.
          </Note>
        </>
      ) : null}
    </>
  )
}
