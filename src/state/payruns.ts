import { OT, PAYCFG, PAYRUNS, type Overtime } from '@/data/hrms'
import { STAFF } from '@/data/people'
import { createStore, useStore } from '@/lib/store'
import { fmtDate } from '@/lib/format'
import { now } from '@/lib/clock'
import { currentPayCfg, currentStaff } from './company'
import { currentOvertime } from './overtime'
import type { PayConfig, PayRun, Person, RunState } from '@/data/types'

/** What a run keeps when it closes, so its payslips cannot move afterwards. */
export interface Kept {
  cfg: PayConfig
  staff: Person[]
  ot: Overtime[]
}

export interface RunRecord extends PayRun {
  kept?: Kept
}

/* Approval closes the month ("after this the month is closed to edits",
   RUNSTEPS), and paid is past approval. */
const closes = (state: RunState) => state === 'approved' || state === 'paid'

/* Runs the seed already closed were approved against the seed's settings and roster. */
const SEED: Record<string, RunRecord> = Object.fromEntries(
  Object.entries(PAYRUNS).map(([mn, run]) => [
    mn,
    closes(run.state) ? { ...run, kept: { cfg: PAYCFG, staff: STAFF, ot: OT } } : { ...run },
  ]),
)

const store = createStore<Record<string, RunRecord>>(SEED)

export const useRuns = (): Record<string, RunRecord> => useStore(store)

export const runOf = (mn: string): RunRecord | undefined => store.get()[mn]

export function setRunState(mn: string, to: RunState, by?: string): void {
  store.update((prev) => {
    const run = prev[mn]
    if (!run) return prev
    const next: RunRecord = { ...run, state: to, published: run.published || to === 'paid' }
    if (to === 'approved') {
      next.by = by ?? run.by
      next.at = fmtDate(now())
    }
    if (closes(to) && !run.kept) {
      next.kept = { cfg: currentPayCfg(), staff: currentStaff(), ot: currentOvertime() }
    }
    return { ...prev, [mn]: next }
  })
}

export const resetRuns = store.reset
