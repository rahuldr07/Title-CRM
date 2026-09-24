import { describe, expect, it } from 'vitest'
import {
  EMPTY_RANGE,
  INVOICE_MONTHS,
  balance,
  inRange,
  invoicesNow,
  monthBounds,
  monthInRange,
  normalise,
  outstandingOf,
  rangeForMonth,
  rangeMonth,
  statusOf,
  unbilledOrders,
  sumBy,
} from '@/lib/invoices'
import { parseIso } from '@/lib/format'
import { INVOICES } from '@/data/business'
import { CLIENTS } from '@/data/catalog'
import { saveClient } from '@/state/company'
import { recordPayment } from '@/state/invoices'
import type { Invoice } from '@/data/types'

/**
 * Scoping the invoice register, and the money it adds up.
 *
 * One filter with two faces — a month dropdown and a pair of dates — and the
 * property that makes the arrangement worth having is that the two can never
 * contradict each other: a month must produce a range, and that range must
 * report back the month it came from.
 */

describe('a month’s bounds', () => {
  it('reads the label rather than the month’s position in the register', () => {
    /* The bounds used to be counted from an index into INVOICE_MONTHS against a
       hardcoded March 2026. Months the register does not hold prove which of
       the two is being read. */
    expect(monthBounds('Jan 2027')).toEqual(['2027-01-01', '2027-01-31'])
    expect(monthBounds('Dec 2025')).toEqual(['2025-12-01', '2025-12-31'])
  })

  it('gets February right in a leap year and out of one', () => {
    expect(monthBounds('Feb 2028')).toEqual(['2028-02-01', '2028-02-29'])
    expect(monthBounds('Feb 2027')).toEqual(['2027-02-01', '2027-02-28'])
  })

  it('answers nothing for a label that is not a month', () => {
    expect(monthBounds('custom')).toEqual(['', ''])
    expect(monthBounds('Smarch 2026')).toEqual(['', ''])
  })

  it('covers every invoice in the month it is labelled with', () => {
    for (const m of INVOICE_MONTHS) {
      const [from, to] = monthBounds(m)
      for (const i of INVOICES.filter((x) => x.m === m)) {
        expect(inRange(i, { from, to }), `${i.id} falls outside ${m}`).toBe(true)
      }
    }
  })
})

describe('the two faces of the filter', () => {
  it('round-trips every month through its range and back', () => {
    for (const m of INVOICE_MONTHS) expect(rangeMonth(rangeForMonth(m))).toBe(m)
  })

  it('calls no dates “all”, and dates matching no month “custom”', () => {
    expect(rangeMonth(EMPTY_RANGE)).toBe('all')
    expect(rangeMonth({ from: '2026-03-04', to: '2026-03-09' })).toBe('custom')
  })

  it('clears the dates for “all” rather than widening them to cover everything', () => {
    expect(rangeForMonth('all')).toEqual(EMPTY_RANGE)
  })

  it('swaps reversed dates instead of matching nothing', () => {
    expect(normalise({ from: '2026-06-30', to: '2026-06-01' })).toEqual({
      from: '2026-06-01',
      to: '2026-06-30',
    })
  })

  it('keeps a month’s column while the range still touches it', () => {
    const first = INVOICE_MONTHS[0]
    const last = INVOICE_MONTHS[INVOICE_MONTHS.length - 1]
    expect(monthInRange(first, rangeForMonth(first))).toBe(true)
    expect(monthInRange(first, rangeForMonth(last))).toBe(false)
    expect(monthInRange(first, EMPTY_RANGE)).toBe(true)
  })
})

describe('filtering on the issue date', () => {
  it('takes everything when both ends are open', () => {
    expect(INVOICES.every((i) => inRange(i, EMPTY_RANGE))).toBe(true)
  })

  it('treats an open end as open, not as today', () => {
    const latest = INVOICES.reduce((a, b) => (a.issued > b.issued ? a : b))
    expect(inRange(latest, { from: null, to: null })).toBe(true)
    expect(inRange(latest, { from: '2020-01-01', to: null })).toBe(true)
  })

  it('includes an invoice issued on the closing day itself', () => {
    const i = INVOICES[0]
    const day = i.issued
    const stamp = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
    expect(inRange(i, { from: stamp, to: stamp })).toBe(true)
    expect(parseIso(stamp).getDate()).toBe(day.getDate())
  })
})

describe('the money', () => {
  it('never leaves a balance a penny off its own invoice', () => {
    for (const i of INVOICES) expect(balance(i)).toBe(Math.round((i.amt - i.paid) * 100) / 100)
  })

  it('adds a set of invoices up the same way whether summed or subtracted', () => {
    expect(outstandingOf(INVOICES)).toBe(
      Math.round((sumBy(INVOICES, 'amt') - sumBy(INVOICES, 'paid')) * 100) / 100,
    )
  })

  it('never reports an invoice as paid beyond its own amount', () => {
    for (const i of INVOICES) expect(i.paid).toBeLessThanOrEqual(i.amt)
  })
})

/*
 * An invoice's status is worked out, never stored.
 *
 * The seed carried a status per invoice, and nothing moved it when the clock
 * passed the client's terms, so on 3 Aug an invoice a month past Net 30 still
 * read "Part paid" and the Overdue tile showed $23 against more than $20k past
 * terms. Status follows from three facts: the balance, the issue date, and the
 * client's terms.
 */
describe('an invoice’s status', () => {
  const inv = (over: Partial<Invoice> = {}): Invoice => ({
    id: 'INV-T',
    cl: 'T',
    code: 'T',
    m: 'Jul 2026',
    mi: 0,
    amt: 1000,
    paid: 0,
    orders: 10,
    issued: new Date(2026, 6, 1),
    st: 'open',
    ...over,
  })
  const at = (d: number, m = 7) => new Date(2026, m, d, 12)

  it('is paid once nothing is owed, however late it was', () => {
    expect(statusOf(inv({ paid: 1000 }), 'Net 30', at(3))).toBe('paid')
  })

  it('is overdue after the terms run out, even when part paid', () => {
    expect(statusOf(inv({ paid: 400 }), 'Net 30', at(3))).toBe('overdue')
  })

  it('is part paid while still inside its terms', () => {
    expect(statusOf(inv({ paid: 400 }), 'Net 30', at(20, 6))).toBe('part')
  })

  it('is open while unpaid and inside its terms', () => {
    expect(statusOf(inv(), 'Net 30', at(20, 6))).toBe('open')
  })

  it('is not overdue on its last day of terms', () => {
    /* Issued 1 Jul on Net 30: due 31 Jul, so paying on the 31st is on time. */
    expect(statusOf(inv(), 'Net 30', new Date(2026, 6, 31, 23, 59))).toBe('open')
    expect(statusOf(inv(), 'Net 30', new Date(2026, 7, 1, 0, 1))).toBe('overdue')
  })

  it('reads the number of days from the terms', () => {
    expect(statusOf(inv(), 'Net 15', at(17, 6))).toBe('overdue')
    expect(statusOf(inv(), 'Net 30', at(17, 6))).toBe('open')
  })

  it('treats terms with no days as due on the day it was issued', () => {
    expect(statusOf(inv(), 'Per order', new Date(2026, 6, 1, 18))).toBe('open')
    expect(statusOf(inv(), 'Per order', at(2, 6))).toBe('overdue')
  })
})

describe('the register on the pinned day', () => {
  const owed = (st: string) =>
    invoicesNow()
      .filter((i) => i.st === st)
      .reduce((a, i) => a + balance(i), 0)

  it('shows MGR’s July invoice as overdue, not part paid', () => {
    expect(invoicesNow().find((i) => i.id === 'INV-2026-0405')?.st).toBe('overdue')
  })

  it('counts more than $20k as overdue', () => {
    expect(owed('overdue')).toBeGreaterThan(20_000)
  })

  it('follows a change to the client’s terms', () => {
    const mgr = CLIENTS.find((c) => c.n === 'MGR')!
    saveClient({ ...mgr, terms: 'Net 60' }, 'MGR')
    expect(invoicesNow().find((i) => i.id === 'INV-2026-0405')?.st).toBe('part')
  })

  it('leaves the seed register untouched', () => {
    const before = INVOICES.map((i) => i.st)
    invoicesNow()
    expect(INVOICES.map((i) => i.st)).toEqual(before)
  })
})

/*
 * Orders with no invoice are counted against the invoices, not against the
 * client record's own figure — which is a different count, and put 323 of MGR's
 * orders "with no invoice" when its invoices bill all 1,436.
 */
describe('orders with no invoice', () => {
  it('is none when the invoices bill every order', () => {
    const mgr = CLIENTS.find((c) => c.n === 'MGR')!
    expect(unbilledOrders(mgr, invoicesNow())).toBe(0)
  })

  it('counts what the invoices leave out', () => {
    const mgr = CLIENTS.find((c) => c.n === 'MGR')!
    expect(unbilledOrders({ ...mgr, orders: mgr.orders + 7 }, invoicesNow())).toBe(7)
  })
})

/*
 * Recording a payment. Month-end could not be closed from the register: there
 * was no way to take money against an invoice, so nothing on it could ever
 * move from owed to paid.
 */
describe('recording a payment', () => {
  const july = () => invoicesNow().find((i) => i.id === 'INV-2026-0405')!

  it('takes it off what is owed', () => {
    const before = balance(july())
    expect(recordPayment('INV-2026-0405', 5000)).toBeNull()
    expect(balance(july())).toBeCloseTo(before - 5000, 2)
  })

  it('settles the invoice when it covers the balance', () => {
    recordPayment('INV-2026-0405', balance(july()))
    expect(july().st).toBe('paid')
  })

  it('refuses more than is owed', () => {
    expect(recordPayment('INV-2026-0405', balance(july()) + 1)).toMatch(/more than/i)
    expect(july().st).toBe('overdue')
  })

  it('refuses nothing, or less than nothing', () => {
    expect(recordPayment('INV-2026-0405', 0)).toMatch(/above zero/i)
  })

  it('leaves the bundled register alone', () => {
    recordPayment('INV-2026-0405', 100)
    expect(INVOICES.find((i) => i.id === 'INV-2026-0405')!.paid).toBe(9629.9)
  })
})
