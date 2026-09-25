import { createContext, use, useCallback, useMemo, type ReactNode } from 'react'
import type { Overtime } from '@/data/hrms'
import { claimOvertime as claimOt, decideOvertime as decideOt, useOvertime } from '@/domain/payroll/overtime'
import { useSession } from '@/domain/auth/SessionProvider'
import { withLocation } from './workingDay'
import {
  breakEnd as breakEndIn,
  breakStart as breakStartIn,
  checkIn as checkInIn,
  checkOut as checkOutIn,
  decideCorrection as decideCorrectionIn,
  decideSwap as decideSwapIn,
  requestSwap as requestSwapIn,
  setWaived as setWaivedIn,
  useLedger,
} from './timeclock'
import type { DayMark, LateMark, Punch, Regularisation, Swap } from '@/data/types'

interface TimeclockValue {
  marks: Record<string, DayMark>
  punches: Punch[]
  corrections: Regularisation[]
  swaps: Swap[]
  late: LateMark[]
  overtime: Overtime[]

  markOf: (id: string) => DayMark | null
  waiting: number

  checkIn: (personId: string, done?: (msg: string) => void) => void
  checkOut: (personId: string, done?: (msg: string) => void) => void
  breakStart: (personId: string) => string
  breakEnd: (personId: string) => string

  decideCorrection: (id: string, st: 'approved' | 'rejected') => string | null
  decideSwap: (id: string, st: 'approved' | 'rejected') => string | null
  requestSwap: (from: string, to: string, date: string, why: string) => string | null
  decideOvertime: (id: string, st: 'approved' | 'rejected') => string | null
  claimOvertime: (personId: string, d: string, minutes: number, why: string) => string | null
  setWaived: (id: string, waived: boolean) => string | null
}

const TimeclockContext = createContext<TimeclockValue | null>(null)

export function TimeclockProvider({ children }: { children: ReactNode }) {
  const { me } = useSession()
  const ledger = useLedger()
  const overtime = useOvertime()

  const markOf = useCallback((id: string) => ledger.marks[id] ?? null, [ledger])

  const checkIn = useCallback(
    (personId: string, done?: (msg: string) => void) =>
      withLocation((fix, err) => done?.(checkInIn(me, personId, fix, err))),
    [me],
  )
  const checkOut = useCallback(
    (personId: string, done?: (msg: string) => void) =>
      withLocation((fix, err) => done?.(checkOutIn(me, personId, fix, err))),
    [me],
  )
  const breakStart = useCallback((personId: string) => breakStartIn(me, personId), [me])
  const breakEnd = useCallback((personId: string) => breakEndIn(me, personId), [me])
  const decideCorrection = useCallback(
    (id: string, st: 'approved' | 'rejected') => decideCorrectionIn(me, id, st),
    [me],
  )
  const decideSwap = useCallback((id: string, st: 'approved' | 'rejected') => decideSwapIn(me, id, st), [me])
  const requestSwap = useCallback(
    (from: string, to: string, date: string, why: string) => requestSwapIn(me, from, to, date, why),
    [me],
  )
  const decideOvertime = useCallback((id: string, st: 'approved' | 'rejected') => decideOt(me, id, st), [me])
  const claimOvertime = useCallback(
    (personId: string, d: string, minutes: number, why: string) => claimOt(me, personId, d, minutes, why),
    [me],
  )
  const setWaived = useCallback((id: string, waived: boolean) => setWaivedIn(me, id, waived), [me])

  const value = useMemo<TimeclockValue>(() => {
    const pendingCorrections = ledger.corrections.filter((r) => r.st === 'pending').length
    const pendingOt = overtime.filter((o) => o.st === 'pending').length
    const pendingSwaps = ledger.swaps.filter((s) => s.st === 'pending').length
    return {
      ...ledger,
      overtime,
      markOf,
      waiting: pendingCorrections + pendingOt + pendingSwaps,
      checkIn,
      checkOut,
      breakStart,
      breakEnd,
      decideCorrection,
      decideSwap,
      requestSwap,
      decideOvertime,
      claimOvertime,
      setWaived,
    }
  }, [
    ledger,
    overtime,
    markOf,
    checkIn,
    checkOut,
    breakStart,
    breakEnd,
    decideCorrection,
    decideSwap,
    requestSwap,
    decideOvertime,
    claimOvertime,
    setWaived,
  ])

  return <TimeclockContext value={value}>{children}</TimeclockContext>
}

export function useTimeclock(): TimeclockValue {
  const ctx = use(TimeclockContext)
  if (!ctx) throw new Error('useTimeclock must be used inside <TimeclockProvider>')
  return ctx
}
