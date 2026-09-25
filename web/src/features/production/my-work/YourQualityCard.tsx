import { Btn } from '@/shared/ui/Button'
import { Card, Label } from '@/shared/ui/Card'
import { Rows } from '@/shared/ui/DetailList'
import { SkeletonRows } from '@/shared/ui/Skeleton'
import { ScoreGauge } from './ScoreGauge'
import type { QcEntry } from '@/data/quality'
import { fmtDate } from '@/shared/lib/format'
import { Inline, Note } from '@/shared/ui/Layout'

export function YourQualityCard({
  showScores,
  pending,
  rated,
  qavg,
  rangeLabel,
  onAll,
}: {
  showScores: boolean
  pending: boolean
  rated: QcEntry[]
  qavg: number | null
  rangeLabel: string
  onAll: () => void
}) {
  return (
    <Card padded>
      <Label>Your quality</Label>
      {!showScores ? (
        <>
          <Note margin={0}>
            Scores are not shown to the person rated on this account.
          </Note>
          <Note top={10}>
            That is a company setting — <b>Quality → How scoring works → “Scores are visible to
            the person rated”</b>. It is off by default, on the view that ratings used for filing
            should not be read as a report card.
          </Note>
        </>
      ) : pending ? (
        <SkeletonRows rows={3} cols={2} />
      ) : rated.length && qavg !== null ? (
        <>
          <Inline gap={12} style={{ margin: '8px 0 10px' }}>
            <ScoreGauge value={qavg} />
            <span className="gr">
              from {rated.length} checks · {rangeLabel}
            </span>
          </Inline>
          {rated.filter((x) => x.note).length ? (
            <Rows bare>
              {rated
                .filter((x) => x.note)
                .slice(0, 4)
                .map((x, i) => (
                  <div className="rw" key={`${x.order}-${i}`}>
                    <span className="warn" style={{ fontSize: 'var(--t-lead)' }}>
                      ⚑
                    </span>
                    <span>
                      <b style={{ fontSize: 'var(--t-small)' }}>{x.note}</b>
                      <div className="sd gr">
                        {x.crit} · {x.order} · {fmtDate(x.d)}
                      </div>
                    </span>
                    <span />
                  </div>
                ))}
            </Rows>
          ) : (
            <Note margin={0}>
              Nothing has been raised against your work in this range.
            </Note>
          )}
          <Btn variant="ghost" small className="mwAll" onClick={onAll}>
            All of it
          </Btn>
        </>
      ) : (
        <Note margin={0}>
          Nothing of yours has been checked in this range.
        </Note>
      )}
    </Card>
  )
}
