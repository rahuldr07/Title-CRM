import type { ReactNode } from 'react'
import { Card, Label } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { hm, ist, shiftHours, worked, type RestState } from '@/domain/attendance/workingDay'
import { fmtDate } from '@/shared/lib/format'
import { now } from '@/shared/lib/clock'
import type { DayMark, Shift } from '@/data/types'
import { Inline } from '@/shared/ui/Layout'

export function TodayCard({
  shift,
  mark,
  rest,
  actions,
}: {
  shift: Shift
  mark: DayMark | null
  rest: RestState | null
  actions: ReactNode
}) {
  return (
    <Card padded bottom={16}>
      <Inline wrap gap={16}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <Label>Today — {fmtDate(now())}</Label>
          <div style={{ fontSize: 'var(--t-body)', marginTop: 6 }}>
            <Chip kind={shift.c}>{shift.n}</Chip>{' '}
            <span className="gr">
              {shiftHours(shift)}
            </span>
          </div>
          {mark ? (
            <>
              <div className="gr" style={{ fontSize: 'var(--t-small)', marginTop: 7 }}>
                In at <b className="mono">{ist(mark.in)}</b>
                {mark.out ? (
                  <>
                    {' · out at '}
                    <b className="mono">{ist(mark.out)}</b> · <b>{hm(worked(mark))}</b>
                  </>
                ) : (
                  ' · still working'
                )}
                {mark.late ? <span className="warn"> · {mark.late} minutes late</span> : null}
              </div>
              <div className="gr" style={{ fontSize: 'var(--t-label)', marginTop: 3 }}>
                {mark.inside ? <span className="ok">✓</span> : <span className="warn">◷</span>}{' '}
                {mark.where}
                {mark.acc ? ` · accurate to ${mark.acc} m` : ''}
              </div>
            </>
          ) : (
            <div className="gr" style={{ fontSize: 'var(--t-small)', marginTop: 7 }}>
              Not marked yet. Checking in asks the browser where you are.
            </div>
          )}
        </div>
        <Inline wrap gap={9}>{actions}</Inline>
      </Inline>

      {rest ? (
        <div
          className="rw"
          style={{
            background: rest.ok ? 'var(--oktint)' : 'var(--warntint)',
            borderRadius: 9,
            padding: '11px 13px',
            marginTop: 12,
          }}
        >
          <span className={rest.ok ? 'ok' : 'warn'} style={{ fontSize: 'var(--t-lead)' }}>
            {rest.ok ? '✓' : '◷'}
          </span>
          <span>
            <b>{rest.ok ? 'Rest break taken' : 'No rest break yet'}</b>
            <div className="sd">{rest.msg}</div>
          </span>
          <span />
        </div>
      ) : null}

      {mark?.breakMins ? (
        <div className="gr" style={{ fontSize: 'var(--t-label)', marginTop: 8 }}>
          Break: {mark.breakMins} minutes
          {mark.breakIn && !mark.breakOut ? ' — on a break now' : ''}
        </div>
      ) : null}
    </Card>
  )
}
