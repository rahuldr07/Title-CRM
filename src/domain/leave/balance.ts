import { useMemo } from 'react'
import { currentLeave, currentLeaveTypes, compOffEarned, useLeave, useLeaveTypes } from './leaveStore'
import { now } from '@/shared/lib/clock'
import type { Leave, LeaveType } from '@/data/types'

export interface Balance {
  earned: number
  taken: number
  pending: number
  left: number
  annual: number
}

export function leaveBalance(
  pid: string,
  requests: readonly Leave[] = currentLeave(),
  types: readonly LeaveType[] = currentLeaveTypes(),
): Record<string, Balance> {
  const out: Record<string, Balance> = {}
  const mine = requests.filter((l) => l.who === pid)
  const days = (k: string, st: string) => mine.filter((l) => l.type === k && l.st === st).reduce((a, l) => a + l.days, 0)
  types.forEach((t) => {
    const taken = days(t.k, 'approved')
    const pending = days(t.k, 'pending')
    const earned = t.k === 'co' ? compOffEarned(pid) : Math.round((t.annual * (now().getMonth() + 1)) / 12)
    out[t.k] = { earned, taken, pending, left: Math.max(0, earned - taken - pending), annual: t.annual }
  })
  return out
}

export function useLeaveBalance(pid: string): Record<string, Balance> {
  const requests = useLeave()
  const types = useLeaveTypes()
  return useMemo(() => leaveBalance(pid, requests, types), [pid, requests, types])
}
