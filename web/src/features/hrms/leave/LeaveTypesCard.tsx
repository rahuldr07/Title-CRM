import { Card, Label } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { useLeaveTypes } from '@/domain/leave/leaveStore'
import { Note } from '@/shared/ui/Layout'

export function LeaveTypesCard() {
  const types = useLeaveTypes()
  return (
    <Card padded top={18}>
      <Label>How each type behaves</Label>
      {types.map((t) => (
        <div className="rw tagged" key={t.k} style={{ padding: '9px 0' }}>
          <span>
            <Chip kind={t.c}>{t.n}</Chip>
          </span>
          <span>
            <div className="sd">{t.d}</div>
          </span>
          <span className="mono gr" style={{ fontSize: 'var(--t-label)' }}>
            {t.annual ? `${t.annual} a year` : 'earned'}
          </span>
        </div>
      ))}
      <Note top={12}>
        Anything taken beyond the balance becomes unpaid leave, and shows on the payslip as a
        deduction rather than disappearing.
      </Note>
    </Card>
  )
}
