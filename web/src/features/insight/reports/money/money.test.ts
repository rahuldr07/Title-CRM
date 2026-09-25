import { describe, expect, it } from 'vitest'
import { moneyByClient, moneyByMonth } from './money'
import { balance, invoicesNow } from '@/domain/invoices/invoices'
import { r2 } from '@/shared/lib/format'

describe('money by month', () => {
  const inv = invoicesNow()
  const months = moneyByMonth(inv)

  it('bills what the register bills, in month order', () => {
    expect(r2(months.reduce((a, m) => a + m.billed, 0))).toBe(r2(inv.reduce((a, i) => a + i.amt, 0)))
    expect(months.map((m) => m.m)).toEqual(['Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026'])
  })

  it('owes what was billed less what was paid', () => {
    months.forEach((m) => expect(m.owed).toBe(r2(m.billed - m.paid)))
  })

  it('counts as overdue only what overdue invoices still owe', () => {
    const jul = months.find((m) => m.m === 'Jul 2026')!
    const want = inv.filter((i) => i.m === 'Jul 2026' && i.st === 'overdue').reduce((a, i) => a + balance(i), 0)
    expect(jul.overdue).toBe(r2(want))
  })
})

describe('money by client', () => {
  it('ranks clients by what they were billed', () => {
    const c = moneyByClient(invoicesNow())
    expect(c[0]?.cl).toBe('MGR')
    expect(c.every((x, i) => (c[i - 1]?.billed ?? Infinity) >= x.billed)).toBe(true)
  })
})
