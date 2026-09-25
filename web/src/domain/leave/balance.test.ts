import { afterEach, describe, expect, it } from 'vitest'
import { resetClock, setClock } from '@/shared/lib/clock'
import { currentStaff } from '@/domain/people/roster'
import { leaveBalance } from './balance'
import { cancelLeave, currentLeave, decideLeave, fileLeave, type LeaveRequest } from './leaveStore'
import { must } from '../../../tests/must'

const ADMIN = { id: 'hw', r: 'admin', n: 'Harry Whitfield' }
const UMA = { id: 'us', r: 'staff' }

const compOff = (days = 1): LeaveRequest => ({
  who: 'us',
  type: 'co',
  from: new Date(2026, 8, 7),
  to: new Date(2026, 8, 6 + days),
  days,
  reason: 'Weekend cover taken back',
})

const filed = (): string => {
  expect(fileLeave(UMA, compOff())).toBeNull()
  return must(currentLeave()[0], 'the request just filed').id
}

describe('a comp-off balance', () => {
  it('is held while a request waits, and comes back whole when it is declined', () => {
    const before = leaveBalance('us').co
    const id = filed()
    expect(leaveBalance('us').co?.left).toBe((before?.left ?? 0) - 1)
    expect(leaveBalance('us').co?.earned, 'asking for comp-off does not earn any').toBe(before?.earned)

    expect(decideLeave(ADMIN, id, 'rejected')).toBeNull()
    expect(leaveBalance('us').co).toEqual(before)
  })

  it('comes back whole when the request is cancelled', () => {
    const before = leaveBalance('us').co
    expect(cancelLeave(UMA, filed())).toBeNull()
    expect(leaveBalance('us').co).toEqual(before)
  })

  it('is spent when the request is approved', () => {
    const before = must(leaveBalance('us').co, 'a comp-off balance')
    expect(decideLeave(ADMIN, filed(), 'approved')).toBeNull()
    expect(leaveBalance('us').co).toEqual({ ...before, taken: before.taken + 1, left: before.left - 1 })
  })

  it('does not count a declined request as comp-off that was earned', () => {
    expect(leaveBalance('ap').co?.earned, 'ap has one approved and one declined comp-off in the seed').toBe(3)
  })
})

describe('leave balances', () => {
  afterEach(resetClock)

  const ACCRUING = ['pl', 'cl', 'sl', 'co']

  it('never shows more taken than earned, or a negative balance', () => {
    currentStaff().forEach((p) => {
      Object.entries(leaveBalance(p.id))
        .filter(([kind]) => ACCRUING.includes(kind))
        .forEach(([kind, b]) => {
          expect(
            b.taken + b.pending,
            `${p.n}/${kind}: booked ${b.taken + b.pending} days against ${b.earned} accrued`,
          ).toBeLessThanOrEqual(b.earned)

          expect(b.left, `${p.n}/${kind}: the balance shown is not what is left`).toBe(
            b.earned - b.taken - b.pending,
          )
        })
    })
  })

  it('accrues by the month, against the clock', () => {
    setClock(() => new Date(2026, 5, 30))

    const june = leaveBalance('ap')
    expect(june.pl).toEqual({ annual: 18, earned: 9, taken: 0, pending: 3, left: 6 })
    expect(june.sl).toEqual({ annual: 8, earned: 4, taken: 3, pending: 0, left: 1 })
  })

  it('shows less of it in March than in June, which is what "accrues" means', () => {
    setClock(() => new Date(2026, 2, 31))

    const march = leaveBalance('ap')
    expect(march.pl?.earned, 'the accrual no longer moves with the month').toBe(5)
    expect(march.pl?.left).toBe(2)

    expect(march.sl?.earned).toBe(2)
    expect(march.sl?.taken).toBe(3)
    expect(march.sl?.left).toBe(0)
  })
})
