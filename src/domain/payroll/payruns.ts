import { currentStaff } from '@/domain/people/roster'
// eslint-disable-next-line no-restricted-imports -- a run closed in the seed keeps the seed pay settings and overtime it was approved with
import { OT, PAYCFG, PAYMONTHS, PAYRUNS, RUNSTATE, type Overtime } from '@/data/hrms'
// eslint-disable-next-line no-restricted-imports -- a run closed in the seed keeps the seed roster it was approved with
import { STAFF } from '@/data/people'
import { createStore, useStore } from '@/shared/lib/store'
import { usDate } from '@/shared/lib/format'
import { now } from '@/shared/lib/clock'
import { currentPayCfg } from '@/domain/company/company'
import { currentOvertime } from './overtime'
// eslint-disable-next-line no-restricted-imports -- a run closed in the seed keeps the seed loans and repayments it was approved with
import { LOANPAYMENTS, LOANS } from '@/data/loans'
import { currentLoanPayments, currentLoans } from '@/domain/loans/loanStore'
import type { ChipKind, LoanPayment, LoanRecord, PayConfig, PayRun, Person, RunState } from '@/data/types'
import { refusal } from '@/domain/auth/permissions'

const PAYROLL_RUNNER = 'pricing'

interface Kept {
  cfg: PayConfig
  staff: Person[]
  ot: Overtime[]
  loans: LoanRecord[]
  payments: LoanPayment[]
}

export interface RunRecord extends PayRun {
  kept?: Kept
}

const closes = (state: RunState) => state === 'approved' || state === 'paid'

const SEED_KEPT: Kept = { cfg: PAYCFG, staff: STAFF, ot: OT, loans: LOANS, payments: LOANPAYMENTS }

const SEED: Record<string, RunRecord> = Object.fromEntries(
  Object.entries(PAYRUNS).map(([mn, run]) => [mn, closes(run.state) ? { ...run, kept: SEED_KEPT } : { ...run }]),
)

const store = createStore<Record<string, RunRecord>>(SEED)

export const useRuns = (): Record<string, RunRecord> => useStore(store)

export const runOf = (mn: string): RunRecord | undefined => store.get()[mn]

export const payCfgOf = (mn: string): PayConfig => runOf(mn)?.kept?.cfg ?? currentPayCfg()

export const LATEST_PAY_MONTH: string = PAYMONTHS.at(-1) ?? ''

export const runIn = (runs: Record<string, RunRecord>, mn: string): RunRecord =>
  runs[mn] ?? { m: mn, state: 'draft', published: false, by: null, at: null }

export const runStateOf = (state: RunState): [label: string, kind: ChipKind, note: string] =>
  RUNSTATE[state] ?? [state, 'n', '']

export function setRunState(actor: Pick<Person, 'id' | 'r' | 'n'>, mn: string, to: RunState): string | null {
  const refused = refusal(actor, PAYROLL_RUNNER, 'Moving a pay run on')
  if (refused) return refused
  const by = actor.n
  store.update((prev) => {
    const run = prev[mn]
    if (!run) return prev
    const next: RunRecord = { ...run, state: to, published: run.published || to === 'paid' }
    if (to === 'approved') {
      next.by = by
      next.at = usDate(now())
    }
    if (closes(to) && !run.kept) {
      next.kept = {
        cfg: currentPayCfg(),
        staff: currentStaff(),
        ot: currentOvertime(),
        loans: currentLoans(),
        payments: currentLoanPayments(),
      }
    }
    return { ...prev, [mn]: next }
  })
  return null
}

export const resetRuns = store.reset
