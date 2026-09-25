import { SWAPS } from '@/data/attendance'
import { createStore, useStore } from '@/shared/lib/store'
import { now } from '@/shared/lib/clock'
import { currentDateFormat, parseDate, usDate } from '@/shared/lib/format'
import { OWN_REQUEST, decidesOwn, refusal, type Actor } from '@/domain/auth/permissions'
import { personById } from '@/domain/people/roster'
import { makeLateLog, makeRegularisations } from './attendance'
import { clockNow, ist, lateBy, mins, placeOf, shiftOf, worked, type Fix } from './workingDay'
import type { DayMark, LateMark, Person, Punch, Regularisation, Swap } from '@/data/types'

interface Ledger {
  marks: Record<string, DayMark>
  punches: Punch[]
  corrections: Regularisation[]
  swaps: Swap[]
  late: LateMark[]
}

const store = createStore<Ledger>({
  marks: {},
  punches: [],
  corrections: makeRegularisations(),
  swaps: SWAPS,
  late: makeLateLog(),
})

export const useLedger = (): Ledger => useStore(store)

export type Decider = Pick<Person, 'id' | 'n' | 'r'>

const ATTENDANCE_DECIDER = 'all'

const OWN_ONLY = 'The time clock records your own day, not somebody else’s.'

const punch = (p: Punch) => (l: Ledger): Ledger => ({ ...l, punches: [p, ...l.punches] })

const setMark = (personId: string, m: DayMark) => (l: Ledger): Ledger => ({ ...l, marks: { ...l.marks, [personId]: m } })

export function checkIn(actor: Actor, personId: string, fix: Fix | null, err: string | null): string {
  if (actor.id !== personId) return OWN_ONLY
  const person = personById(personId)
  if (!person) return 'That person is not on the roster.'
  const at = clockNow()
  const sh = shiftOf(person)
  const { where, inside } = placeOf(fix, err)
  const behind = lateBy(at, sh)
  const mark: DayMark = { in: at, out: null, late: behind, shift: sh.k, where, inside, acc: fix?.acc ?? null }
  store.update((l) =>
    punch({ who: personId, d: usDate(now()), t: at, kind: 'in', where, inside, acc: fix?.acc ?? null })(setMark(personId, mark)(l)),
  )
  return behind ? `Checked in ${behind} minutes after ${ist(sh.from)}` : 'Checked in'
}

export function checkOut(actor: Actor, personId: string, fix: Fix | null, err: string | null): string {
  if (actor.id !== personId) return OWN_ONLY
  const m = store.get().marks[personId]
  if (!m || !m.in) return 'Check in first'
  const at = clockNow()
  const { where, inside } = placeOf(fix, err)
  const next: DayMark = { ...m, out: at, outWhere: where }
  store.update((l) =>
    punch({ who: personId, d: usDate(now()), t: at, kind: 'out', where, inside, acc: fix?.acc ?? null })(setMark(personId, next)(l)),
  )
  const total = worked(next)
  return `Checked out — ${Math.floor(total / 60)}h ${String(total % 60).padStart(2, '0')}m`
}

export function breakStart(actor: Actor, personId: string): string {
  if (actor.id !== personId) return OWN_ONLY
  const m = store.get().marks[personId]
  if (!m || !m.in) return 'Check in first'
  if (m.out) return 'The day is already closed'
  if (m.breakIn && !m.breakOut) return 'Already on a break'
  const next: DayMark = { ...m, breakIn: clockNow(), breakOut: null }
  store.update((l) =>
    punch({ who: personId, d: usDate(now()), t: next.breakIn ?? '', kind: 'break out', where: m.where, inside: m.inside })(
      setMark(personId, next)(l),
    ),
  )
  return 'Break started'
}

export function breakEnd(actor: Actor, personId: string): string {
  if (actor.id !== personId) return OWN_ONLY
  const m = store.get().marks[personId]
  if (!m || !m.breakIn || m.breakOut) return 'Not on a break'
  const out = clockNow()
  const next: DayMark = { ...m, breakOut: out, breakMins: (m.breakMins ?? 0) + Math.max(0, mins(out) - mins(m.breakIn)) }
  store.update((l) =>
    punch({ who: personId, d: usDate(now()), t: out, kind: 'break in', where: m.where, inside: m.inside })(setMark(personId, next)(l)),
  )
  return `Back — ${next.breakMins} minutes of break so far`
}

const deciderRefusal = (decider: Decider, doing: string) => refusal(decider, ATTENDANCE_DECIDER, doing)

export function decideCorrection(decider: Decider, id: string, st: 'approved' | 'rejected'): string | null {
  const r = store.get().corrections.find((x) => x.id === id)
  if (!r) return 'That correction is no longer waiting.'
  if (decidesOwn([r.who], decider.id)) return OWN_REQUEST
  const refused = deciderRefusal(decider, 'Deciding an attendance correction')
  if (refused) return refused
  store.update((l) => ({ ...l, corrections: l.corrections.map((x) => (x.id === id ? { ...x, st } : x)) }))
  return null
}

export function decideSwap(decider: Decider, id: string, st: 'approved' | 'rejected'): string | null {
  const x = store.get().swaps.find((s) => s.id === id)
  if (!x) return 'That swap is no longer waiting.'
  if (decidesOwn([x.from, x.to], decider.id)) return OWN_REQUEST
  const refused = deciderRefusal(decider, 'Deciding a shift swap')
  if (refused) return refused
  store.update((l) => ({ ...l, swaps: l.swaps.map((s) => (s.id === id ? { ...s, st, by: decider.n } : s)) }))
  return null
}

export function requestSwap(actor: Actor, from: string, to: string, date: string, why: string): string | null {
  if (actor.id !== from) return 'A swap is asked for by the person giving up the shift.'
  const day = parseDate(date)
  if (Number.isNaN(day.getTime())) return `Write the day as ${currentDateFormat()}.`
  store.update((l) => ({
    ...l,
    swaps: [{ id: `S${9000 + l.swaps.length}`, from, to, d: usDate(day), why, st: 'pending' }, ...l.swaps],
  }))
  return null
}

export function setWaived(actor: Actor, id: string, waived: boolean): string | null {
  const refused = refusal(actor, ATTENDANCE_DECIDER, 'Waiving a late mark')
  if (refused) return refused
  store.update((l) => ({ ...l, late: l.late.map((x) => (x.id === id ? { ...x, waived } : x)) }))
  return null
}
