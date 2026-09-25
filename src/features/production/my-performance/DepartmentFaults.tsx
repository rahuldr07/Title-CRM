import { useStageName } from '@/domain/company/naming'
import { Card, Label } from '@/shared/ui/Card'
import { SectionHead } from '@/shared/ui/PageHead'
import { QC_FIX } from '@/data/quality'
import { Note } from '@/shared/ui/Layout'

export function DepartmentFaults({ dept, top }: { dept: string; top: [reason: string, count: number][] }) {
  const stageName = useStageName()
  return (
    <>
      <SectionHead id="mfDept">Your department</SectionHead>
      <Card padded>
        <Label>What {stageName(dept)} keeps losing marks on</Label>
        {top.length ? (
          top.map(([reason, n]) => (
            <div className="rw" style={{ padding: '9px 0' }} key={reason}>
              <span className={n > 2 ? 'warn' : 'gr'} style={{ fontSize: 'var(--t-lead)' }}>
                {n > 2 ? '⚑' : '○'}
              </span>
              <span>
                <b style={{ fontSize: 'var(--t-body)' }}>{reason}</b>
                <div className="sd gr">{n} across the department</div>
                <div className="sd" style={{ marginTop: 4 }}>
                  {QC_FIX[reason] ?? ''}
                </div>
              </span>
              <span className="mono gr">{n}</span>
            </div>
          ))
        ) : (
          <Note margin={0}>
            Nothing recurring in {stageName(dept)}.
          </Note>
        )}
        <Note top={12}>
          The same mistake made by different people is a process problem, not a person
          problem — it usually means a step is missing from how the work is set up rather
          than from how it is done.
        </Note>
      </Card>
    </>
  )
}
