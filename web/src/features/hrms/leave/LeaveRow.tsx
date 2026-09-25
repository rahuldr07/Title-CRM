import { useStageName } from '@/domain/company/naming'
import { whoName, findPerson } from '@/domain/people/roster'
import { Avatar } from '@/shared/ui/Avatar'
import { Btn } from '@/shared/ui/Button'
import { Chip } from '@/shared/ui/Chip'
import { LVSTATUS } from '@/data/hrms'
import { useLeaveTypes } from '@/domain/leave/leaveStore'
import { managerOf } from '@/domain/leave/leave'
import { decidesOwn } from '@/domain/auth/permissions'
import { fmtDate, labelOf, r2 } from '@/shared/lib/format'
import { now } from '@/shared/lib/clock'
import type { Leave, Person } from '@/data/types'
import { Cell, FlexRow } from '@/shared/ui/FlexTable'
import { Inline } from '@/shared/ui/Layout'

export const COLS = '170px 140px 190px 70px 1fr 210px'

export function LeaveRow({
  l,
  mine,
  staff,
  meId,
  canAssign,
  onDecide,
  onCancel,
}: {
  l: Leave
  mine: boolean
  staff: Person[]
  meId: string
  canAssign: boolean
  onDecide: (id: string, st: 'approved' | 'rejected') => void
  onCancel: (l: Leave) => void
}) {
  const t = useLeaveTypes().find((x) => x.k === l.type)
  const stageName = useStageName()
  const chip = t ? <Chip kind={t.c}>{t.n}</Chip> : <Chip>{l.type}</Chip>
  const owner = findPerson(staff, l.who)
  const approver = managerOf(owner)
  return (
    <FlexRow cols={COLS}>
      <Cell>
        {mine ? (
          chip
        ) : (
          <Inline gap={8}>
            <Avatar name={whoName(l.who)} />
            <div className="v">{whoName(l.who)}</div>
          </Inline>
        )}
      </Cell>
      <Cell>
        {mine ? (
          <div className="v mono" style={{ fontSize: 'var(--t-small)' }}>
            {fmtDate(l.from)}
          </div>
        ) : (
          chip
        )}
      </Cell>
      <Cell>
        <div className="v" style={{ fontSize: 'var(--t-small)' }}>
          {mine ? l.reason : `${fmtDate(l.from)} → ${fmtDate(l.to)}`}
        </div>
      </Cell>
      <Cell>
        <div className="v mono">{l.days}</div>
      </Cell>
      <Cell>
        {mine ? (
          <Chip kind={labelOf(LVSTATUS, l.st)[1]}>{labelOf(LVSTATUS, l.st)[0]}</Chip>
        ) : (
          <div className="v" style={{ fontSize: 'var(--t-small)' }}>
            {l.reason}
          </div>
        )}
        {l.clash ? (
          <>
            <div className="s bad">
              {stageName(l.clash.dep)} down to {l.clash.left} of {l.clash.team}
              {l.clash.who.length ? ` · with ${l.clash.who.join(', ')}` : ''}
            </div>
            {l.clash.cover ? <div className="s">They say: {l.clash.cover}</div> : null}
          </>
        ) : null}
        {l.shortNotice !== null && l.shortNotice !== undefined ? (
          <div className="s warn">
            {l.shortNotice === 0 ? 'starting today' : `${l.shortNotice} days notice`}
          </div>
        ) : null}
        {l.overBalance ? (
          <div className="s warn">{r2(l.overBalance)} beyond balance — unpaid</div>
        ) : null}
      </Cell>
      <Cell>
        {l.st === 'pending' ? (
          canAssign && !decidesOwn([l.who], meId) ? (
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              {approver?.id === meId ? null : (
                <span className="gr" style={{ fontSize: 'var(--t-label)' }}>
                  {approver?.n ?? '—'}
                </span>
              )}
              <Btn variant="ghost" small onClick={() => onDecide(l.id, 'rejected')}>
                Decline
              </Btn>
              <Btn small onClick={() => onDecide(l.id, 'approved')}>
                Approve
              </Btn>
            </span>
          ) : (
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <Chip kind="r">Awaiting approval</Chip>
              <Btn variant="ghost" small onClick={() => onCancel(l)}>
                Cancel
              </Btn>
            </span>
          )
        ) : l.st === 'approved' && l.who === meId && l.from > now() ? (
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <Chip kind="v">Approved</Chip>
            <Btn variant="ghost" small onClick={() => onCancel(l)}>
              Cancel
            </Btn>
          </span>
        ) : (
          <>
            <div className="v" style={{ fontSize: 'var(--t-small)' }}>
              <Chip kind={labelOf(LVSTATUS, l.st)[1]}>{labelOf(LVSTATUS, l.st)[0]}</Chip>
            </div>
            {l.by ? <div className="s">{l.by}</div> : null}
          </>
        )}
      </Cell>
    </FlexRow>
  )
}
