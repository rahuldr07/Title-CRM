import { Card, Label } from '@/shared/ui/Card'
import type { StageWork } from '@/domain/quality/quality'
import { Inline, Note } from '@/shared/ui/Layout'

export function TimingCard({ t }: { t: StageWork | null }) {
  return (
    <Card padded>
      <Label>How long your work takes</Label>
      {t ? (
        <>
          <Inline gap={9} align="baseline" style={{ margin: '8px 0 10px' }}>
            <b className="mono" style={{ fontSize: 'var(--t-display)' }}>
              {t.ratio.toFixed(2)}×
            </b>
            <span className="gr">of the time allowed for your stage, typically</span>
          </Inline>
          <div style={{ position: 'relative' }}>
            <div className="bar" style={{ height: 12 }}>
              <i
                style={{
                  width: `${Math.min(100, Math.round(t.ratio * 70))}%`,
                  background: t.ratio > 1 ? 'var(--warn)' : 'var(--ok)',
                }}
              />
            </div>
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '70%',
                top: -3,
                height: 18,
                width: 2,
                borderRadius: 1,
                background: 'var(--ink)',
              }}
            />
          </div>
          <Note plain size="label" margin="6px 0 0">
            The mark is the time allowed. Short of it is faster; past it is over.
          </Note>
          <Note top={12}>
            {t.erratic
              ? `Your typical order is comfortably inside budget. What costs you is the spread — ${t.over} of ${t.c} ran long. Those are worth a look: if the long ones have something in common, that is the thing to raise, not your pace.`
              : t.vsPeers >= 5
                ? `You come in ahead of others doing the same stages by ${t.vsPeers} points. Keep an eye on the defect count — time saved by skipping a check is not time saved.`
                : t.vsPeers <= -10
                  ? `Others on the same stages land inside budget ${t.expected}% of the time against your ${t.onBudget}%. That is a real gap, and it is worth asking whether the budget matches the work you are given before treating it as pace.`
                  : 'You track the budget about as closely as everyone else on the same stages.'}
          </Note>
          <Note>
            The budget is your department’s slice of the client’s promise — set under
            Turnaround &amp; SLA, not by you.
          </Note>
        </>
      ) : (
        <Note margin={0}>
          No timed work in this range.
        </Note>
      )}
    </Card>
  )
}
