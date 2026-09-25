import { describe, expect, it } from 'vitest'
import { EMPTY_RANGE, rangeForMonth } from '@/domain/invoices/invoices'
import { fmtDate } from '@/shared/lib/format'
import type { Invoice } from '@/data/types'
import { bare, cellFor, grandTotal, monthTotal, rangeLabelOf, scopeLabel, statusPills } from './invoiceView'

const inv = (id: string, cl: string, m: string, amt: number, st: Invoice['st'], issued: Date): Invoice => ({
  id,
  cl,
  code: cl,
  m,
  mi: 0,
  amt,
  paid: 0,
  orders: 1,
  issued,
  st,
})

const ALL = [
  inv('a', 'MGR', 'Jun 2026', 100, 'paid', new Date(2026, 5, 3)),
  inv('b', 'MGR', 'Jul 2026', 250.5, 'overdue', new Date(2026, 6, 2)),
  inv('c', 'ACME', 'Jul 2026', 40, 'open', new Date(2026, 6, 20)),
]

describe('the invoicing view', () => {
  it('prints a figure without its dollar sign', () => {
    expect(bare(1234.5)).toBe('1,234.50')
  })

  it('names the date range as a month, a custom span, or nothing', () => {
    expect(rangeLabelOf(EMPTY_RANGE, 'all')).toBeNull()
    expect(rangeLabelOf(rangeForMonth('Jul 2026'), 'Jul 2026')).toBe('Jul 2026')
    expect(rangeLabelOf({ from: null, to: null }, 'custom')).toBe('anything to now')
    expect(rangeLabelOf({ from: '2026-05-01', to: null }, 'custom')).toBe(`${fmtDate(new Date('2026-05-01'))} to now`)
  })

  it('describes the scope from the filters, or says everything', () => {
    expect(scopeLabel('all', null, 'all')).toBe('everything')
    expect(scopeLabel('MGR', 'Jul 2026', 'overdue')).toBe('MGR · Jul 2026 · overdue')
    expect(scopeLabel('all', null, 'part')).toBe('part paid')
  })

  it('totals a client-month cell, a month and the corner under the status and range', () => {
    expect(cellFor(ALL, 'MGR', 'Jul 2026', 'all', EMPTY_RANGE)).toEqual({ amt: 250.5, n: 1 })
    expect(cellFor(ALL, 'MGR', 'Jul 2026', 'paid', EMPTY_RANGE)).toEqual({ amt: 0, n: 0 })
    expect(monthTotal(ALL, 'Jul 2026', 'all', EMPTY_RANGE)).toBe(290.5)
    expect(grandTotal(ALL, 'all', EMPTY_RANGE)).toBe(390.5)
    expect(grandTotal(ALL, 'all', { from: '2026-07-01', to: '2026-07-10' })).toBe(250.5)
  })

  it('counts every status pill over the scope', () => {
    expect(statusPills(ALL)).toEqual([
      ['all', 'All', 3],
      ['open', 'Open', 1],
      ['part', 'Part paid', 0],
      ['overdue', 'Overdue', 1],
      ['paid', 'Paid', 1],
    ])
  })
})
