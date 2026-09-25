import { Card } from '@/shared/ui/Card'
import { SectionHead } from '@/shared/ui/PageHead'
import { QC_FIX, type QcEntry } from '@/data/quality'
import { Inline, Note } from '@/shared/ui/Layout'

export function HabitCards({
  habits,
  below,
  recent,
  older,
  checked,
  rangeLabel,
}: {
  habits: [reason: string, count: number][]
  below: QcEntry[]
  recent: QcEntry[]
  older: QcEntry[]
  checked: number
  rangeLabel: string
}) {
  return habits.length ? (
    <>
      <SectionHead id="mfHabits">
        What to improve — {habits.length} thing{habits.length === 1 ? '' : 's'} that came
        up more than once
      </SectionHead>
      {habits.map(([reason, n]) => {
        const stillHappening = recent.filter((x) => x.note === reason).length
        const usedTo = older.filter((x) => x.note === reason).length
        return (
          <Card padded key={reason} bottom={12}>
            <Inline gap={12} align="flex-start">
              <span className="warn" style={{ fontSize: 'var(--t-h3)', lineHeight: 1.2 }}>
                ⚑
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--t-lead)', fontWeight: 650 }}>{reason}</div>
                <div className="gr" style={{ fontSize: 'var(--t-small)', marginTop: 2 }}>
                  {n} times in {rangeLabel}
                  {stillHappening === 0 ? (
                    <>
                      {' — '}
                      <b className="ok">none in the more recent half</b>
                    </>
                  ) : usedTo === 0 ? (
                    <>
                      {' — '}
                      <b className="warn">all of them recently</b>
                    </>
                  ) : null}
                </div>
                <div
                  className="rw"
                  style={{
                    background: 'var(--brandsoft)',
                    border: '1px solid color-mix(in srgb, var(--brand) 22%, transparent)',
                    borderRadius: 9,
                    padding: '12px 14px',
                    marginTop: 11,
                  }}
                >
                  <span className="brand" style={{ fontSize: 'var(--t-lead)' }}>
                    →
                  </span>
                  <span>
                    <b>What to do next</b>
                    <div className="sd">
                      {QC_FIX[reason] ?? 'No practice recorded for this one yet.'}
                    </div>
                  </span>
                  <span />
                </div>
                <div className="gr" style={{ fontSize: 'var(--t-label)', marginTop: 9 }}>
                  On {below.filter((x) => x.note === reason).map((x) => x.order).join(', ')}
                </div>
              </div>
            </Inline>
          </Card>
        )
      })}
    </>
  ) : (
    <Card padded top={16}>
      <Note margin={0}>
        {below.length
          ? 'Nothing has come up twice. Everything below is a one-off, and a one-off is not a habit worth changing your method for.'
          : checked
            ? `Nothing was raised against your work in this range — all ${checked} checks came back clean.`
            :
              'None of your work was checked in this range. Widen the range, or check whether the work you do gets rated at all.'}
      </Note>
    </Card>
  )
}
