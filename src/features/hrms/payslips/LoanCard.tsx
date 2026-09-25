import { Bar } from '@/shared/ui/Bar'
import { Btn } from '@/shared/ui/Button'
import { Card, Label } from '@/shared/ui/Card'
import { LNKIND } from '@/data/loans'
import { inr } from '@/domain/company/money'
import { useGo } from '@/shared/hooks/useGo'
import { outstanding, scheduleFor } from '@/domain/loans/loans'
import { useLoans } from '@/domain/loans/loanStore'
import { labelOf } from '@/shared/lib/format'
import { Inline } from '@/shared/ui/Layout'

export function LoanCard({ personId }: { personId: string }) {
  const go = useGo()
  const { loans, payments } = useLoans()
  const mine = loans.filter((l) => l.who === personId && (l.st === 'active' || l.st === 'paused'))

  if (!mine.length) return null

  return (
    <Card padded top={16}>
      <Label>My loan{mine.length > 1 ? 's' : ''}</Label>
      <div style={{ display: 'grid', gap: 16, marginTop: 10 }}>
        {mine.map((loan) => {
          const bal = outstanding(loan)
          const next = scheduleFor(loan, payments).find((r) => r.status === 'due')
          return (
            <div key={loan.id}>
              <Inline align={false} justify="space-between" style={{ fontSize: 'var(--t-body)' }}>
                <b>{labelOf(LNKIND, loan.kind)[0]}</b>
                <span className="mono">{inr(loan.amt)}</span>
              </Inline>
              <Bar value={loan.paid} max={loan.amt} />
              <Inline className="gr" align={false} justify="space-between" style={{ fontSize: 'var(--t-small)', marginTop: 6 }}>
                <span>Recovered {inr(loan.paid)}</span>
                <span>Balance {inr(bal)}</span>
              </Inline>
              <Inline justify="space-between" style={{ marginTop: 10 }}>
                <span className="s">
                  {loan.st === 'paused'
                    ? 'Paused'
                    : next
                      ? `Next EMI ${inr(next.amount)} · ${next.due}`
                      : 'Nothing due next run'}
                </span>
                <Btn
                  variant="ghost"
                  small
                  onClick={() =>
                    go({ to: '/loans/$loanId', params: { loanId: loan.id }, search: { tab: 'Schedule' } })
                  }
                >
                  View schedule
                </Btn>
              </Inline>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
