import { useStageName } from '@/domain/company/naming'
import { Btn } from '@/shared/ui/Button'
import { useLeavePolicy } from '@/domain/leave/leaveStore'
import { CLASHRULES } from '@/domain/leave/leave'
import { whoName } from '@/domain/people/roster'
import { fmtDate } from '@/shared/lib/format'
import type { Leave, Person } from '@/data/types'

export function LeaveAlerts({
  mine,
  risky,
  approvedSoon,
  waitingOnMe,
  reportsToMe,
  onPolicy,
}: {
  mine: boolean
  risky: Leave[]
  approvedSoon: { l: Leave }[]
  waitingOnMe: Leave[]
  reportsToMe: Person[]
  onPolicy: () => void
}) {
  const policy = useLeavePolicy()
  const stageName = useStageName()
  return (
    <>
      {!mine && (risky.length || approvedSoon.length) ? (
        <div className="bnr d" style={{ marginTop: 14 }}>
          <span className="bi">⚑</span>
          <div>
            <div className="bt">
              {risky.length + approvedSoon.length} thing
              {risky.length + approvedSoon.length === 1 ? '' : 's'} would leave a department below cover
            </div>
            {risky.length ? (
              <>
                <b>{risky.length} waiting on a decision:</b>{' '}
                {risky.map((l) => `${whoName(l.who)} — ${stageName(l.clash?.dep ?? '')} down to ${l.clash?.left}`).join(' · ')}.
              </>
            ) : null}
            {approvedSoon.length ? (
              <>
                <br />
                <b>{approvedSoon.length} already approved:</b>{' '}
                {approvedSoon.map((x) => `${whoName(x.l.who)} from ${fmtDate(x.l.from)}`).join(' · ')}.
                Worth arranging cover now rather than on the day.
              </>
            ) : null}
            <div className="bs">
              The policy asks for at least {policy.minCover} working per department, and is set to “
              {(CLASHRULES[policy.clashRule]?.[0] ?? policy.clashRule).toLowerCase()}”.
            </div>
          </div>
          <div className="ba">
            <Btn variant="ghost" small onClick={onPolicy}>
              The policy
            </Btn>
          </div>
        </div>
      ) : null}

      {!mine && waitingOnMe.length ? (
        <div className="bnr r" style={{ marginTop: 14 }}>
          <span className="bi">◷</span>
          <div>
            <div className="bt">
              {waitingOnMe.length} request{waitingOnMe.length === 1 ? '' : 's'}{' '}
              {waitingOnMe.length === 1 ? 'is' : 'are'} yours to decide
            </div>
            {reportsToMe.length} people report to you:{' '}
            {reportsToMe.slice(0, 6).map((x) => x.n).join(', ')}
            {reportsToMe.length > 6 ? ' and others' : ''}. Everyone else’s requests are shown too, but
            they belong to another approver.
          </div>
        </div>
      ) : null}
    </>
  )
}
