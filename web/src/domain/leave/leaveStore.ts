import { LEAVE, LEAVEPOLICY, LEAVETYPES } from '@/data/hrms'
import { createStore, useStoreSlice } from '@/shared/lib/store'
import { now } from '@/shared/lib/clock'
import { OWN_REQUEST, decidesOwn, refusal, type Actor } from '@/domain/auth/permissions'
import type { Leave, LeavePolicy, LeaveType, Person } from '@/data/types'

interface LeaveBook {
  requests: Leave[]
  policy: LeavePolicy
  types: LeaveType[]
}

const store = createStore<LeaveBook>({ requests: LEAVE, policy: LEAVEPOLICY, types: LEAVETYPES })

const COMP_OFF_IN_HAND = 2

const compOffBehind = (pid: string) =>
  LEAVE.filter((l) => l.who === pid && l.type === 'co' && l.st === 'approved').length

export const compOffEarned = (pid: string): number => compOffBehind(pid) + COMP_OFF_IN_HAND

export const currentLeave = (): Leave[] => store.get().requests
export const useLeave = (): Leave[] => useStoreSlice(store, (s) => s.requests)
export const currentLeavePolicy = (): LeavePolicy => store.get().policy
export const useLeavePolicy = (): LeavePolicy => useStoreSlice(store, (s) => s.policy)
export const currentLeaveTypes = (): LeaveType[] => store.get().types
export const useLeaveTypes = (): LeaveType[] => useStoreSlice(store, (s) => s.types)

const LEAVE_DECIDER = 'assign'
const LEAVE_POLICY_EDITOR = 'people'

export type LeaveRequest = Omit<Leave, 'id' | 'st' | 'by' | 'at'>

export function fileLeave(actor: Actor, request: LeaveRequest): string | null {
  if (request.who !== actor.id) {
    const refused = refusal(actor, LEAVE_POLICY_EDITOR, 'Asking for leave on someone else’s behalf')
    if (refused) return refused
  }
  if (!(request.days > 0)) return 'How long?'
  const id = `L${9000 + currentLeave().length}`
  store.update((s) => ({ ...s, requests: [{ ...request, id, st: 'pending', by: null, at: null }, ...s.requests] }))
  return null
}

const replace = (id: string, fn: (l: Leave) => Leave) =>
  store.update((s) => ({ ...s, requests: s.requests.map((l) => (l.id === id ? fn(l) : l)) }))

export function decideLeave(
  decider: Pick<Person, 'id' | 'r' | 'n'>,
  id: string,
  st: 'approved' | 'rejected',
): string | null {
  const l = currentLeave().find((x) => x.id === id)
  if (!l) return 'That request is no longer in the register.'
  if (decidesOwn([l.who], decider.id)) return OWN_REQUEST
  const refused = refusal(decider, LEAVE_DECIDER, 'Deciding a leave request')
  if (refused) return refused
  if (l.st !== 'pending') return 'That request has already been decided.'
  replace(id, (x) => ({ ...x, st, by: decider.n, at: now() }))
  return null
}

export function cancelLeave(actor: Actor, id: string): string | null {
  const l = currentLeave().find((x) => x.id === id)
  if (!l) return 'That request is no longer in the register.'
  if (l.who !== actor.id) return 'Only the person who asked for it can cancel a leave request.'
  if (l.st !== 'pending' && l.st !== 'approved') return 'That request is already closed.'
  if (l.from < now()) return 'That leave has already started. Raise it as an attendance correction instead.'
  replace(id, (x) => ({ ...x, st: 'cancelled' }))
  return null
}

export function setLeavePolicy<K extends keyof LeavePolicy>(actor: Actor, k: K, v: LeavePolicy[K]): string | null {
  const refused = refusal(actor, LEAVE_POLICY_EDITOR, 'Changing the leave policy')
  if (refused) return refused
  store.update((s) => ({ ...s, policy: { ...s.policy, [k]: v } }))
  return null
}

const leaveTypeKey = (name: string, count: number): string =>
  name.trim().toLowerCase().replace(/[^a-z]/g, '').slice(0, 4) || `t${count}`

export function saveLeaveType(actor: Actor, next: LeaveType, k?: string): string | null {
  const refused = refusal(actor, LEAVE_POLICY_EDITOR, 'Changing the leave types')
  if (refused) return refused
  if (!next.n.trim()) return 'A type needs a name'
  if (k) {
    store.update((s) => ({ ...s, types: s.types.map((t) => (t.k === k ? { ...next, k } : t)) }))
    return null
  }
  const key = leaveTypeKey(next.n, currentLeaveTypes().length)
  if (currentLeaveTypes().some((t) => t.k === key)) return 'That name is too close to an existing type'
  store.update((s) => ({ ...s, types: [...s.types, { ...next, k: key }] }))
  return null
}

const leaveTypeInUse = (k: string): boolean => currentLeave().some((l) => l.type === k)

export function removeLeaveType(actor: Actor, k: string): string | null {
  const refused = refusal(actor, LEAVE_POLICY_EDITOR, 'Changing the leave types')
  if (refused) return refused
  if (leaveTypeInUse(k)) return 'Somebody has already used that type, so it cannot be removed — the history would stop making sense.'
  store.update((s) => ({ ...s, types: s.types.filter((t) => t.k !== k) }))
  return null
}
