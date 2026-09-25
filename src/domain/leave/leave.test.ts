import { describe, expect, it } from 'vitest'
import { CLASHRULES, approvesFor, availOn, leaveCheck, managerOf, onLeaveOn } from './leave'
import { payTotals, payslipOf } from '@/domain/payroll/payroll'
import { leaveBalance } from './balance'
import { setLeavePolicy } from './leaveStore'
import { ATT, LEAVE, LEAVEPOLICY } from '@/data/hrms'
import { STAFF } from '@/data/people'
import { saveStaff } from '@/domain/people/roster'
import { now } from '@/shared/lib/clock'
import type { Leave, Person } from '@/data/types'
import { must } from '../../../tests/must'

const FAR = new Date(2026, 10, 2)
const FAR_END = new Date(2026, 10, 3)
const MONTH = 'Jul 2026'

const person = (id: string) => STAFF.find((p) => p.id === id)!

function withClashRule<T>(rule: string, fn: () => T): T {
  setLeavePolicy({ id: 'hw', r: 'admin' }, 'clashRule', rule)
  return fn()
}

function withLeave<T>(rows: Leave[], fn: () => T): T {
  LEAVE.push(...rows)
  try {
    return fn()
  } finally {
    rows.forEach((r) => LEAVE.splice(LEAVE.indexOf(r), 1))
  }
}

function withStaff<T>(rows: Person[], fn: () => T): T {
  STAFF.push(...rows)
  try {
    return fn()
  } finally {
    rows.forEach((r) => STAFF.splice(STAFF.indexOf(r), 1))
  }
}

function withUnpaidDays<T>(id: string, extra: number, fn: () => T): T {
  const row = must(ATT[MONTH]?.[id], `${id}'s attendance in ${MONTH}`)
  const saved = row.lop
  row.lop = saved + extra
  try {
    return fn()
  } finally {
    row.lop = saved
  }
}

const off = (id: string, st: Leave['st']): Leave => ({
  id: `TEST-${id}`,
  who: id,
  type: 'pl',
  from: FAR,
  to: FAR_END,
  days: 2,
  st,
  reason: 'injected by the test',
  by: null,
  at: null,
})

describe('the balance a request is judged against', () => {
  it('is derived from the register, not stored', () => {
    expect(leaveBalance('vs').cl).toEqual({ earned: 5, taken: 3, pending: 0, left: 2, annual: 8 })

    const over = leaveCheck('vs', 'cl', 3, FAR, FAR_END)
    expect(over.notes[0]?.body).toContain('2 left of 5 earned')
  })

  it('counts a request still awaiting approval as already spent', () => {
    expect(leaveBalance('ap').pl).toEqual({ earned: 12, taken: 0, pending: 3, left: 9, annual: 18 })

    expect(leaveCheck('ap', 'pl', 9, FAR, FAR_END).overBalance).toBe(0)
    expect(leaveCheck('ap', 'pl', 10, FAR, FAR_END).overBalance).toBe(1)
  })

  it('says what would remain, and says nothing about unpaid days, while it fits', () => {
    const c = leaveCheck('sm', 'cl', 2, FAR, FAR_END)

    expect(c.overBalance).toBe(0)
    expect(c.blocked).toBe(false)
    expect(c.needReason).toBe(false)
    expect(c.notes).toEqual([{ kind: 'v', body: '3 days would remain.' }])
  })

  it('treats a request that exactly exhausts the balance as still inside it', () => {
    const exact = leaveCheck('vs', 'cl', 2, FAR, FAR_END)
    expect(exact.overBalance).toBe(0)
    expect(exact.notes[0]).toEqual({ kind: 'v', body: '0 days would remain.' })

    const over = leaveCheck('vs', 'cl', 3, FAR, FAR_END)
    expect(over.overBalance).toBe(1)
    expect(over.notes[0]?.kind).toBe('d')
    expect(over.notes[0]?.title).toBe('1 day beyond your balance')

    const half = leaveCheck('vs', 'cl', 2.5, FAR, FAR_END)
    expect(half.overBalance).toBe(0.5)
    expect(half.notes[0]?.title).toBe('0.5 days beyond your balance')
  })

  it('never reports an overdraft on a balance that was not touched', () => {
    expect(leaveCheck('sm', 'pl', 1, FAR, FAR_END).overBalance).toBe(0)

    expect(1 - must(leaveBalance('sm').pl, 'a PL balance').left).toBe(-11)
  })
})

describe('cover', () => {
  it('lets a request through when the department can spare the person', () => {
    const c = leaveCheck('gk', 'cl', 1, FAR, FAR_END)

    expect(c.cover).toEqual({ dep: 'RTS', team: 3, off: 1, left: 2 })
    expect(c.short).toBe(0)
    expect(c.blocked).toBe(false)
    expect(c.needReason).toBe(false)
    expect(c.notes).toHaveLength(1)
  })

  it('fires the moment the same request would empty the department', () => {
    expect(leaveCheck('gk', 'cl', 1, FAR, FAR_END).needReason).toBe(false)

    const rows = [off('tr', 'pending'), off('nb', 'approved')]
    const broken = withLeave(rows, () => leaveCheck('gk', 'cl', 1, FAR, FAR_END))

    expect(broken.cover).toEqual({ dep: 'RTS', team: 3, off: 3, left: 0 })
    expect(broken.short).toBe(1)
    expect(broken.needReason).toBe(true)
    expect(broken.clash.map((x) => x.who)).toEqual(['tr', 'nb'])
    expect(broken.notes[1]?.title).toBe('RTS would have nobody working')
    expect(broken.notes[1]?.body).toContain('Already off across these dates: Tara R')
    expect(broken.notes[1]?.body).toContain('Neil Barrow')

    expect(leaveCheck('gk', 'cl', 1, FAR, FAR_END).needReason).toBe(false)
  })

  it('leaves the policy to decide how hard it pushes back', () => {
    const ask = () => leaveCheck('vs', 'cl', 2, FAR, FAR_END)

    const reason = ask()
    expect(reason.short).toBe(1)
    expect(reason.needReason).toBe(true)
    expect(reason.blocked).toBe(false)
    expect(reason.notes[1]?.body).toContain('You can still send it')

    const blocked = withClashRule('block', ask)
    expect(blocked.blocked).toBe(true)
    expect(blocked.needReason).toBe(false)
    expect(blocked.notes[1]?.body).toContain('This request cannot be sent while that is true')

    const warned = withClashRule('warn', ask)
    expect(warned.blocked).toBe(false)
    expect(warned.needReason).toBe(false)
    expect(warned.notes[1]?.title).toBe('Doc Req would have nobody working')
    expect(warned.notes[1]?.body).toContain('Worth agreeing cover before you send it')

    expect(LEAVEPOLICY.clashRule).toBe('reason')
  })

  it('offers exactly the three settings the check implements', () => {
    const verdicts = Object.keys(CLASHRULES).map((rule) => {
      const c = withClashRule(rule, () => leaveCheck('vs', 'cl', 2, FAR, FAR_END))
      return [rule, `blocked=${c.blocked} needReason=${c.needReason}`] as const
    })

    expect(Object.fromEntries(verdicts)).toEqual({
      warn: 'blocked=false needReason=false',
      reason: 'blocked=false needReason=true',
      block: 'blocked=true needReason=false',
    })
    expect(Object.keys(CLASHRULES)).toContain(LEAVEPOLICY.clashRule)
  })
})

describe('who a request goes to', () => {
  const lead = (id: string, n: string, dep: string[]): Person => ({
    ...must(STAFF[0], 'a seeded person'),
    id,
    n,
    dep,
    r: 'lead',
    active: true,
  })

  it('sends everyone to a named person, and the lead to the admin above them', () => {
    expect(managerOf(person('sm'))?.n).toBe('Ashok S')
    expect(managerOf(person('vs'))?.n).toBe('Ashok S')

    expect(managerOf(person('sk'))?.n).toBe('Harry Whitfield')
    expect(
      STAFF.find((x) => x.r === 'lead' && x.dep.some((d) => person('sk').dep.includes(d)))?.id,
      'the self-match this guards against no longer reproduces',
    ).toBe('sk')

    expect(managerOf(undefined)).toBeNull()
  })

  it('prefers a lead of the person’s own department over any other', () => {
    expect(managerOf(person('sm'))?.id).toBe('sk')

    withStaff([lead('sl', 'Search Lead', ['Search'])], () => {
      expect(managerOf(person('sm'))?.id).toBe('sl')
      expect(managerOf(person('pn'))?.id).toBe('sk')
      expect(managerOf(person('sl'))?.id).toBe('sk')
    })

    expect(managerOf(person('sm'))?.id).toBe('sk')
  })

  it('will not route a request to someone who has left', () => {
    const gone: Person = { ...lead('xl', 'Departed Lead', ['Search']), active: false }

    withStaff([gone], () => {
      expect(managerOf(person('sm'))?.id, 'a departed lead was given live requests').toBe('sk')
    })

    withStaff([{ ...gone, active: true }], () => {
      expect(managerOf(person('sm'))?.id).toBe('xl')
    })
  })

  it('puts every person with a department in exactly one approver’s queue', () => {
    const routed = STAFF.flatMap((approver) => approvesFor(approver.id).map((p) => p.id))
    const withDept = STAFF.filter((p) => p.dep.length).map((p) => p.id)

    expect([...routed].sort()).toEqual([...withDept].sort())

    expect(approvesFor('hw').map((p) => p.id)).toEqual(['sk'])
    expect(approvesFor('sk')).toHaveLength(26)
    expect(approvesFor('sk').map((p) => p.id)).not.toContain('sk')

    expect(routed).not.toContain('hw')
  })
})

describe('notice', () => {
  it('counts whole days between midnights, so today is nought days rather than minus one', () => {
    const today = new Date(2026, 7, 3)
    const c = leaveCheck('sm', 'cl', 1, today, today)

    expect(c.notice).toBe(0)
    expect(c.notes[1]).toEqual({
      kind: 'r',
      title: 'Starting today, against 3 normally expected.',
      body: 'Allowed, and the approver will see that it was short notice.',
    })

    expect(Math.round((today.getTime() - now().getTime()) / 86400000)).toBe(-1)
  })

  it('counts up from there, and stops warning once the policy is met', () => {
    const tomorrow = new Date(2026, 7, 4)
    const soon = leaveCheck('sm', 'cl', 1, tomorrow, tomorrow)
    expect(soon.notice).toBe(1)
    expect(soon.notes[1]?.title).toBe('1 day notice, against 3 normally expected.')

    const later = leaveCheck('sm', 'cl', 1, FAR, FAR_END)
    expect(later.notice).toBe(91)
    expect(later.notes).toHaveLength(1)
  })

  it('warns about a long stretch above the policy maximum, without refusing it', () => {
    const long = leaveCheck('sm', 'pl', 11, FAR, new Date(2026, 10, 12))
    expect(long.notes[1]?.title).toBe('11 days at once, against a normal maximum of 10.')
    expect(long.blocked).toBe(false)

    expect(leaveCheck('sm', 'pl', 10, FAR, new Date(2026, 10, 11)).notes).toHaveLength(1)
  })
})

describe('the day beyond the balance, on the payslip', () => {
  it('costs exactly one working day of gross, wherever it lands', () => {
    const check = leaveCheck('sm', 'cl', 8, FAR, new Date(2026, 10, 9))
    expect(check.overBalance).toBe(3)
    expect(check.notes[0]?.title).toBe('3 days beyond your balance')
    expect(check.notes[0]?.body).toContain('shows on your payslip as a deduction')

    const p = person('sm')
    const before = payslipOf(p, MONTH)
    expect(before.unpaid).toBe(0)
    expect(before.lopAmt).toBe(0)
    expect(before.gross).toBe(23968)

    const after = withUnpaidDays('sm', check.overBalance, () => payslipOf(p, MONTH))
    expect(after.unpaid).toBe(3)
    expect(after.lopAmt).toBe(Math.round(before.perDay * check.overBalance))
    expect(after.lopAmt).toBe(2663)
    expect(before.gross - after.gross).toBe(2663)
    expect(after.net).toBe(20710)

    const flagged = withUnpaidDays('sm', check.overBalance, () => payTotals(MONTH).lop.map((x) => x.p.id))
    expect(flagged).toContain('sm')
    expect(payTotals(MONTH).lop.map((x) => x.p.id)).not.toContain('sm')
  })

  it('does not reach the payslip on its own — only the balance moves', () => {
    const rec: Leave = {
      id: 'TEST-over',
      who: 'sm',
      type: 'cl',
      from: new Date(2026, 6, 6),
      to: new Date(2026, 6, 13),
      days: 8,
      st: 'approved',
      reason: 'injected by the test',
      by: null,
      at: null,
      overBalance: 3,
    }

    withLeave([rec], () => {
      expect(leaveBalance('sm').cl?.taken).toBe(8)
      expect(leaveBalance('sm').cl?.left).toBe(0)

      const s = payslipOf(person('sm'), MONTH)
      expect(s.unpaid).toBe(0)
      expect(s.lopAmt).toBe(0)
      expect(s.gross).toBe(23968)
    })

    expect(leaveBalance('sm').cl?.left).toBe(5)
  })

  it.fails('should deduct an approved over-balance request from the pay', () => {
    const rec: Leave = {
      id: 'TEST-over-2',
      who: 'sm',
      type: 'cl',
      from: new Date(2026, 6, 6),
      to: new Date(2026, 6, 13),
      days: 8,
      st: 'approved',
      reason: 'injected by the test',
      by: null,
      at: null,
      overBalance: 3,
    }

    withLeave([rec], () => {
      expect(payslipOf(person('sm'), MONTH).unpaid).toBe(3)
    })
  })
})

describe('what it lets through in silence', () => {
  it('says nothing about a request that started two days ago', () => {
    const back = new Date(2026, 7, 1)
    const c = leaveCheck('sm', 'cl', 1, back, back)

    expect(c.notice).toBe(-2)
    expect(c.notes.filter((n) => n.kind === 'r')).toEqual([])
  })

  it('answers for a person who does not exist', () => {
    const c = leaveCheck('nobody', 'cl', 1, FAR, FAR_END)

    expect(c.cover).toBeNull()
    expect(c.overBalance).toBe(0)
    expect(c.notes).toEqual([{ kind: 'v', body: '4 days would remain.' }])
  })

  it('does not notice that the applicant is already off across those dates', () => {
    const again = new Date(2026, 5, 17)
    const c = leaveCheck('vs', 'cl', 2, again, new Date(2026, 5, 18))

    expect(c.clash).toEqual([])
    expect(c.notes[0]).toEqual({ kind: 'v', body: '0 days would remain.' })
  })

  it('counts every day of an explicitly unpaid request as beyond the balance', () => {
    const c = leaveCheck('sm', 'lop', 2, FAR, FAR_END)

    expect(c.notes).toEqual([])
    expect(c.overBalance).toBe(2)
  })
})

describe('being on leave on a day', () => {
  const day = (d: number, h = 0) => new Date(2026, 7, d, h)
  const oneDay: Leave = {
    id: 'LT1', who: 'us', type: 'cl', from: day(3), to: day(3), days: 1,
    st: 'approved', reason: 'x', by: 'Ashok S', at: day(1),
  }

  it('covers every hour of the day', () => {
    withLeave([oneDay], () => {
      expect(onLeaveOn('us', day(3, 0))).toBe(true)
      expect(onLeaveOn('us', day(3, 12))).toBe(true)
      expect(onLeaveOn('us', day(3, 23))).toBe(true)
    })
  })

  it('ends with the day', () => {
    withLeave([oneDay], () => {
      expect(onLeaveOn('us', day(4, 0))).toBe(false)
      expect(onLeaveOn('us', day(2, 23))).toBe(false)
    })
  })

  it('counts only approved leave', () => {
    withLeave([{ ...oneDay, st: 'pending' }], () => {
      expect(onLeaveOn('us', day(3, 12))).toBe(false)
    })
  })
})

describe('availability on a day', () => {
  it('is on leave while approved leave covers it, whatever the standing flag says', () => {
    const p = person('us')
    const leave: Leave = {
      id: 'LT2', who: p.id, type: 'cl', from: new Date(2026, 7, 3), to: new Date(2026, 7, 3), days: 1,
      st: 'approved', reason: 'x', by: 'Ashok S', at: new Date(2026, 7, 1),
    }
    withLeave([leave], () => {
      expect(availOn({ ...p, avail: 'ok' }, new Date(2026, 7, 3, 12))).toBe('leave')
      expect(availOn({ ...p, avail: 'ok' }, new Date(2026, 7, 4, 12))).toBe('ok')
      expect(availOn({ ...p, avail: 'shift' }, new Date(2026, 7, 4, 12))).toBe('shift')
    })
  })
})

describe('the approver comes from the roster the company edits', () => {
  it('names the lead by the name they were last saved with', () => {
    const us = person('us')
    const lead = managerOf(us)!
    saveStaff({ id: 'hw', r: 'admin' }, { ...lead, n: 'Renamed Lead' }, lead.id)
    expect(managerOf(us)?.n).toBe('Renamed Lead')
  })
})
