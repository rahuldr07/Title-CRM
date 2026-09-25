import { Bar } from '@/shared/ui/Bar'
import { Card } from '@/shared/ui/Card'
import { Rows } from '@/shared/ui/DetailList'
import { Kpi, Kpis } from '@/shared/ui/Kpi'
import { SectionHead } from '@/shared/ui/PageHead'
import { RatingsTable } from '@/shared/ui/RatingsTable'
import { SkeletonRows, SkeletonValue } from '@/shared/ui/Skeleton'
import type { QcEntry } from '@/data/quality'
import type { CheckKind } from './personDetail'
import { averageText, qcAverage, reasonCounts } from '@/domain/quality/quality'
import { Inline, Note } from '@/shared/ui/Layout'

export function PersonQualityTab({
  withheld,
  rated,
  given,
  qavg,
  teamAvg,
  loading,
  rangeLabel,
  onChecks,
}: {
  withheld: string | null
  rated: QcEntry[]
  given: QcEntry[]
  qavg: number | null
  teamAvg: number | null
  loading: boolean
  rangeLabel: string
  onChecks: (kind: CheckKind) => void
}) {
  const defects = rated.filter((x) => x.defect)
  const clean = rated.filter((x) => !x.crit)
  const gavg = qcAverage(given)
  const reasons = reasonCounts(rated)

  if (withheld)
    return (
      <Card padded top={16}>
        <Note margin={0}>
          {withheld}
        </Note>
      </Card>
    )

  return (
    <>
      <Kpis style={{ marginTop: 16 }}>
        <Kpi
          title="Quality"
          value={loading ? <SkeletonValue width={64} /> : qavg !== null ? qavg.toFixed(2) : '—'}
          detail={`${rated.length} ratings`}
          hint="Every rating on their work"
          onClick={() => onChecks('all')}
        />
        <Kpi
          title="Defects"
          value={
            <span className={!rated.length ? 'gr' : defects.length ? 'bad' : 'ok'}>
              {rated.length ? defects.length : '—'}
            </span>
          }
          tone={defects.length ? 'alert' : undefined}
          detail={rated.length ? 'a 3 or below' : 'nothing to count'}
          hint="The ones scored 3 or below"
          onClick={() => onChecks('defect')}
        />
        <Kpi
          title="Clean"
          value={
            <span className={rated.length ? 'ok' : 'gr'}>{rated.length ? clean.length : '—'}</span>
          }
          detail={
            rated.length
              ? `${Math.round((clean.length / rated.length) * 100)}% straight fives`
              : 'never rated in this range'
          }
          hint="The ones with nothing raised"
          onClick={() => onChecks('clean')}
        />
        <Kpi
          title="Ratings they gave"
          value={given.length || '—'}
          detail={gavg !== null ? `averaging ${gavg.toFixed(2)}` : 'not a QC role'}
          hint="What they raised on other people"
          onClick={() => onChecks('gave')}
        />
      </Kpis>

      {loading ? (
        <Card top={16}>
          <div className="cb">
            <SkeletonRows rows={5} cols={4} />
          </div>
        </Card>
      ) : rated.length ? (
        <>
          {reasons.length ? (
            <>
              <SectionHead>Why marks came off</SectionHead>
              <Card>
                <Rows bare>
                  {reasons.map(([why, n]) => (
                    <div className="rw" key={why}>
                      <span className={n > 1 ? 'warn' : 'gr'} style={{ fontSize: 'var(--t-lead)' }}>
                        {n > 1 ? '⚑' : '·'}
                      </span>
                      <span>
                        <b>{why}</b>
                        {n > 1 ? <div className="sd warn">{n} times — a habit, not a slip</div> : null}
                      </span>
                      <span className="mono gr">{n}</span>
                    </div>
                  ))}
                </Rows>
              </Card>
            </>
          ) : (
            <Card padded top={16}>
              <Note margin={0}>
                Every rating in this range was a straight 5 on all three criteria.
              </Note>
            </Card>
          )}

          <SectionHead>Every rating — {rangeLabel}</SectionHead>
          <RatingsTable rows={rated} cols="40px 105px 150px 130px 110px 1fr 140px" min={920} />
        </>
      ) : (
        <Card padded top={16}>
          <Note margin={0}>
            No ratings in this range. Either their work was not checked, or they do not do work that
            gets checked.
          </Note>
        </Card>
      )}

      {given.length && gavg !== null && teamAvg !== null ? (
        <>
          <SectionHead>As a checker — {given.length} ratings given</SectionHead>
          <Card padded>
            <Inline align="baseline" gap={10} style={{ marginBottom: 10 }}>
              <b className="mono" style={{ fontSize: 'var(--t-h1)' }}>
                {gavg.toFixed(2)}
              </b>
              <span className="gr">
                average given, against {averageText(teamAvg)} across everyone
              </span>
            </Inline>
            <Bar
              value={Math.min(100, Math.round((gavg / 5) * 100))}
              max={100}
              color={Math.abs(gavg - teamAvg) > 0.06 ? 'var(--warn)' : 'var(--ok)'}
            />
            <Note top={12}>
              {Math.abs(gavg - teamAvg) <= 0.06 ? (
                'They mark in line with everyone else, so their scores can be compared with anyone’s.'
              ) : gavg > teamAvg ? (
                <>
                  They mark <b>{(gavg - teamAvg).toFixed(2)} higher</b> than the company average. Work
                  they check will look better than the same work checked by someone else — worth
                  knowing before comparing two people’s scores.
                </>
              ) : (
                <>
                  They mark <b>{(teamAvg - gavg).toFixed(2)} lower</b> than the company average. Anyone
                  they check will look worse than the same work checked by someone else.
                </>
              )}
            </Note>
            <Note>
              On a scale where almost everything is a 5, who checks the work can matter more than who
              did it.
            </Note>
          </Card>
        </>
      ) : null}
    </>
  )
}
