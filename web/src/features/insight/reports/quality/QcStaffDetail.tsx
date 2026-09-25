import { useStageName } from '@/domain/company/naming'
import { useState } from 'react'
import { useGo } from '@/shared/hooks/useGo'
import { Avatar } from '@/shared/ui/Avatar'
import { BarRow } from '@/shared/ui/Bar'
import { Btn } from '@/shared/ui/Button'
import { Card, Label } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { Empty } from '@/shared/ui/Banner'
import { Rows } from '@/shared/ui/DetailList'
import { SectionHead } from '@/shared/ui/PageHead'
import { FocusHead, FocusKpis } from '@/features/insight/reports/FocusKpis'
import { RatingsTable } from '@/shared/ui/RatingsTable'
import { QcDefects, QcMarks, QcOverBudget } from './QcFocus'
import { averageText, reasonCounts, standing, type RatedPerson, type StageWorkResult } from '@/domain/quality/quality'
import type { QcEntry } from '@/data/quality'
import type { Range } from '@/shared/lib/range'
import { useStaff } from '@/domain/people/roster'
import { criteriaLost, ratersOf } from './qcStats'
import { QcStaffBudget } from './QcStaffBudget'
import { Inline, Note } from '@/shared/ui/Layout'

export function QcStaffDetail({
  name,
  rows,
  range,
  teamAvg,
  people,
  tw,
  onBack,
}: {
  name: string
  rows: QcEntry[]
  range: Range
  teamAvg: number | null
  people: RatedPerson[]
  tw: StageWorkResult
  onBack: () => void
}) {
  const [focus, setFocus] = useState('all')
  const navigate = useGo()
  const stageName = useStageName()
  const mine = rows.filter((x) => x.onName === name).sort((a, b) => +b.d - +a.d)
  const me = people.find((p) => p.n === name)
  const staff = useStaff().find((x) => x.n === name)

  const back = (
    <Btn variant="ghost" small style={{ marginBottom: 14 }} onClick={onBack}>
      ← Everyone
    </Btn>
  )

  if (!mine.length || !me) {
    return (
      <>
        {back}
        <Card>
          <Empty icon="★">
            <b>{name}</b> has no ratings in this range. Widen the range, or check whether their work is being
            rated at all.
          </Empty>
        </Card>
      </>
    )
  }

  const defects = mine.filter((x) => x.defect)
  const below = mine.filter((x) => x.crit)
  const crit = criteriaLost(mine, below)
  const [topCrit] = crit

  const topReasons = reasonCounts(below)
  const raterRows = ratersOf(mine)
  const [topRater] = raterRows

  const gap = teamAvg === null ? 0 : me.o - teamAvg
  const thin = mine.length < 20
  const t = tw.people[name] ?? null
  const sd = t && teamAvg !== null ? standing(me.o, t.vsPeers, teamAvg) : null

  const gapBg =
    Math.abs(gap) < 0.05 ? 'var(--tint)' : gap < 0 ? 'var(--warntint)' : 'var(--oktint)'

  return (
    <>
      {back}

      <Card padded>
        <div className="ch" style={{ border: 'none', padding: '0 0 12px' }}>
          <Inline gap={12}>
            <Avatar
              name={name}
              style={{ width: 38, height: 38, fontSize: 'var(--t-body)' }}
              title={staff ? 'Full profile' : undefined}
              onClick={
                staff ? () => navigate({ to: '/staff/$personId', params: { personId: staff.id } }) : undefined
              }
            />
            <div>
              <h2 style={{ margin: 0, fontSize: 'var(--t-h3)' }}>{name}</h2>
              <div className="gr" style={{ fontSize: 'var(--t-small)' }}>
                {staff ? staff.dep.map(stageName).join(', ') : 'no longer on staff'} · {mine.length} ratings · {range.label}
              </div>
            </div>
          </Inline>
          {staff ? (
            <div className="r">
              <Btn small onClick={() => navigate({ to: '/staff/$personId', params: { personId: staff.id } })}>
                Full profile
              </Btn>
            </div>
          ) : null}
        </div>

        {sd && t ? (
          <div
            className="rw"
            style={{
              background:
                sd[1] === 'v' ? 'var(--oktint)' : sd[1] === 'd' ? 'var(--badtint)' : 'var(--warntint)',
              borderRadius: 9,
              padding: '12px 14px',
              marginBottom: 10,
            }}
          >
            <span>
              <Chip kind={sd[1]}>{sd[0]}</Chip>
            </span>
            <span>
              <b>{sd[2]}</b>
              <div className="sd">
                Quality {me.o.toFixed(2)} against a team {averageText(teamAvg)}, and inside budget on{' '}
                {t.onBudget}% of {t.c} stages — a median {t.ratio.toFixed(2)}× the time allowed.
              </div>
            </span>
            <span />
          </div>
        ) : null}

        <div className="rw" style={{ background: gapBg, borderRadius: 9, padding: '12px 14px' }}>
          <span
            className={Math.abs(gap) < 0.05 ? 'gr' : gap < 0 ? 'warn' : 'ok'}
            style={{ fontSize: 'var(--t-lead)' }}
          >
            {Math.abs(gap) < 0.05 ? '=' : gap < 0 ? '▾' : '▴'}
          </span>
          <span>
            <b>
              {Math.abs(gap) < 0.05
                ? 'Indistinguishable from everyone else'
                : gap < 0
                  ? `${Math.abs(gap).toFixed(2)} below the team average`
                  : `${gap.toFixed(2)} above the team average`}
            </b>
            <div className="sd">
              {me.o.toFixed(2)} against {averageText(teamAvg)} across everyone.{' '}
              {Math.abs(gap) < 0.15
                ? 'On a scale where almost every mark is a 5, a gap this small is noise — read the reasons below, not the number.'
                : gap < 0
                  ? 'Large enough to be worth a conversation, if the reasons below show a pattern.'
                  : 'Consistently clean work in this range.'}
              {thin ? ` Only ${mine.length} ratings, so treat all of this as indicative.` : ''}
            </div>
          </span>
          <span />
        </div>
      </Card>

      <FocusKpis
        focus={focus}
        onFocus={setFocus}
        cards={[
          {
            key: 'all',
            title: 'Quality',
            value: me.o.toFixed(2),
            detail: `${mine.length} ratings`,
            count: mine.length,
          },
          {
            key: 'defects',
            title: 'Defects',
            value: <span className={defects.length ? 'bad' : 'ok'}>{defects.length}</span>,
            tone: defects.length ? 'alert' : undefined,
            detail: 'a 3 or below',
            count: defects.length,
          },
          {
            key: 'over',
            title: 'Inside budget',
            value: t ? <span className={t.onBudget >= 70 ? 'ok' : 'warn'}>{t.onBudget}%</span> : '—',
            tone: t && t.onBudget < 70 ? 'warn' : undefined,
            detail: t ? `${t.c - t.over} of ${t.c} stages` : 'no stage work in range',
            count: t ? t.over : 0,
          },
          {
            key: 'late',
            title: 'Late deliveries they overran on',
            value: t ? <span className={t.causedLate ? 'bad' : 'ok'}>{t.causedLate}</span> : '—',
            tone: t && t.causedLate ? 'alert' : undefined,
            detail: t ? 'their stage went over on a late order' : '',
            count: t ? t.causedLate : 0,
          },
        ]}
      />

      {focus !== 'all' ? (
        <>
          <FocusHead
            title={
              focus === 'defects'
                ? `Showing the ${defects.length} rating${defects.length === 1 ? '' : 's'} that logged a defect`
                : focus === 'over'
                  ? `Showing the ${t?.over ?? 0} stage${t?.over === 1 ? '' : 's'} that went over budget`
                  : `Showing the ${t?.causedLate ?? 0} late deliver${t?.causedLate === 1 ? 'y' : 'ies'} their stage overran on`
            }
            onBack={() => setFocus('all')}
          >
            Everything above is unchanged — only the list below is filtered.
          </FocusHead>

          {focus === 'defects' ? <QcDefects defects={defects} /> : null}
          {focus === 'over' && t ? <QcOverBudget work={t} lateOnly={false} /> : null}
          {focus === 'late' && t ? <QcOverBudget work={t} lateOnly /> : null}
        </>
      ) : (
        <>
      <div className="two" style={{ marginTop: 16 }}>
        <Card padded>
          <Label>Where the marks come off</Label>
          <Note margin="6px 0 12px">
            {below.length
              ? `${below.length} rating${below.length === 1 ? '' : 's'} dropped below 5. This is which criterion caused it.`
              : 'Every rating in this range was a straight 5 on all three criteria.'}
          </Note>
          {crit.map((c) => (
            <BarRow
              key={c.c}
              cols="118px 1fr 92px"
              gap={11}
              label={c.c}
              value={c.n}
              max={below.length}
              color={c.n && c.c === topCrit?.c ? 'var(--warn)' : 'var(--brand2)'}
              right={
                <>
                  {c.avg.toFixed(2)} {c.n ? <span className="gr">· {c.n}</span> : null}
                </>
              }
            />
          ))}
          {below.length && topCrit && topCrit.n >= 2 ? (
            <Note top={12}>
              <b>{topCrit.c}</b> accounts for {Math.round((topCrit.n / below.length) * 100)}% of the marks
              lost — that is the thing to coach, not the average.
            </Note>
          ) : null}
        </Card>

        <QcMarks ratings={mine} />

      </div>

      <Card padded>
        <Label>Who did the rating</Label>
        {raterRows.map((x) => (
          <BarRow
            key={x.n}
            cols="190px 1fr 110px"
            labelClass=""
            label={<b>{x.n}</b>}
            value={x.c}
            max={mine.length}
            color="var(--brand2)"
            right={
              <>
                {x.c} · avg {x.avg.toFixed(2)}
              </>
            }
          />
        ))}
        <Note top={12}>
          {topRater &&
          raterRows.length > 1 &&
          Math.max(...raterRows.map((x) => x.avg)) - Math.min(...raterRows.map((x) => x.avg)) > 0.2
            ? `Worth noticing: their raters do not agree with each other — ${topRater.n} averages ${topRater.avg.toFixed(2)} while another averages ${Math.min(...raterRows.map((x) => x.avg)).toFixed(2)}. On a flat scale, who checks the work can matter more than who did it.`
            : 'Their raters are broadly consistent with one another, so the score is more likely about the work than about who checked it.'}
        </Note>
      </Card>

      {topReasons.length ? (
        <>
          <SectionHead>Why the marks came off — most common first</SectionHead>
          <Card>
            <Rows bare>
              {topReasons.map(([why, n]) => (
                <div className="rw" key={why}>
                  <span className={n > 1 ? 'warn' : 'gr'} style={{ fontSize: 'var(--t-lead)' }}>
                    {n > 1 ? '⚑' : '·'}
                  </span>
                  <span>
                    <b>{why}</b>
                    {n > 1 ? (
                      <div className="sd warn">happened {n} times in this range — a habit, not a slip</div>
                    ) : (
                      <div className="sd gr">once</div>
                    )}
                  </span>
                  <span className="mono gr">{n}</span>
                </div>
              ))}
            </Rows>
          </Card>
          <Note top={10}>
            A repeated reason is worth a five-minute conversation; a one-off usually is not. That distinction
            is the difference between coaching and nagging.
          </Note>
        </>
      ) : null}

      {t ? <QcStaffBudget t={t} /> : null}

      <SectionHead>Every rating in range</SectionHead>
      <RatingsTable
        rows={mine}
        cols="40px 110px 140px 130px 120px 1fr 150px"
        min={1000}
        legend
        highlightDefectsOnly
      />
        </>
      )}
    </>
  )
}
