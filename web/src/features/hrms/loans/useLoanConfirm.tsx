import { Btn } from '@/shared/ui/Button'
import { useSession } from '@/domain/auth/SessionProvider'
import { useUi } from '@/shared/ui/UiProvider'
import { LNKIND } from '@/data/loans'
import { inr } from '@/domain/company/money'
import { outstanding, statusAfter, type LoanAction } from '@/domain/loans/loans'
import { whoName } from '@/domain/people/roster'
import { decideLoan } from '@/domain/loans/loanStore'
import type { LoanRecord } from '@/data/types'
import { labelOf } from '@/shared/lib/format'
import { Note } from '@/shared/ui/Layout'

const VERB: Record<LoanAction, string> = {
  approve: 'Approve',
  reject: 'Reject',
  pause: 'Pause',
  resume: 'Resume',
}

export function useLoanConfirm() {
  const { me } = useSession()
  const { toast, openModal, closeModal } = useUi()

  return (action: LoanAction, loan: LoanRecord) => {
    const result = statusAfter(loan, action, me.id)
    if (!result.ok) {
      toast(result.reason)
      return
    }
    const who = whoName(loan.who)
    openModal({
      title: `${VERB[action]} ${who}’s ${labelOf(LNKIND, loan.kind)[0].toLowerCase()}?`,
      body: (
        <Note plain size="body">
          {inr(loan.amt)} principal, {inr(loan.emi)} EMI, {inr(outstanding(loan))} still outstanding.
          {action === 'approve' ? ' Becomes active and starts recovering from the next payroll run.' : null}
          {action === 'reject' ? ' The request is closed with no amount disbursed.' : null}
          {action === 'pause' ? ' Stops recovering until resumed — the balance owed does not change.' : null}
          {action === 'resume' ? ' Recovery starts again from the next payroll run.' : null}
        </Note>
      ),
      footer: (
        <>
          <Btn variant="ghost" onClick={closeModal}>
            Cancel
          </Btn>
          <Btn
            variant={action === 'reject' ? 'danger' : 'primary'}
            onClick={() => {
              const outcome = decideLoan(me, loan.id, action)
              closeModal()
              toast(outcome.ok ? `${who} — ${VERB[action].toLowerCase()}d` : outcome.reason)
            }}
          >
            {VERB[action]}
          </Btn>
        </>
      ),
    })
  }
}
