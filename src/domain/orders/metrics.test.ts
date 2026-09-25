import { afterEach, describe, expect, it } from 'vitest'
import {
  CAPACITY_AMBER,
  CAPACITY_RED,
  capacityTone,
  onTime30,
  whereTheTimeWent,
  type Delivery,
} from './metrics'
import { SEED_NOW, resetClock, setClock } from '@/shared/lib/clock'
import { registerRows } from '@/domain/payroll/payrollCsv'
import { paidStaff, payslipOf, type Payslip } from '@/domain/payroll/payroll'
import { PAYMONTHS } from '@/data/hrms'
import type { Person } from '@/data/types'
import { must } from '../../../tests/must'

afterEach(resetClock)

const delivery = (daysAgo: number, late: boolean, id = `ORD-${daysAgo}`): Delivery => ({
  id,
  d: new Date(SEED_NOW.getTime() - daysAgo * 86400000),
  cl: 'MGR',
  pr: 'COS',
  slaH: 24,
  st: {},
  by: {},
  byName: {},
  hrs: 12,
  late,
})

describe('where the time went on late deliveries', () => {
  const late = (st: Record<string, number>): Delivery => ({ ...delivery(1, true), st })

  it('charges each late delivery to its longest stage, most first', () => {
    expect(
      whereTheTimeWent([
        late({ Search: 9, Typing: 3 }),
        late({ Search: 2, Typing: 7 }),
        late({ Search: 8, 'Search QC': 1 }),
      ]),
    ).toEqual([
      ['Search', 2],
      ['Typing', 1],
    ])
  })

  it('names no stage for a delivery with no stage hours', () => {
    expect(whereTheTimeWent([late({})])).toEqual([])
  })
})

describe('on-time over thirty days', () => {
  it('is the share delivered inside the promise, as a percentage', () => {
    const out = onTime30([
      delivery(1, false),
      delivery(2, false),
      delivery(3, false),
      delivery(4, true),
    ])
    expect(out.pct).toBe(75)
    expect(out.total).toBe(4)
    expect(out.late).toBe(1)
  })

  it('carries only the late deliveries, which is what the drilldown lists', () => {
    const out = onTime30([delivery(1, false), delivery(2, true, 'ORD-LATE'), delivery(3, false)])
    expect(out.rows.map((r) => r.id)).toEqual(['ORD-LATE'])
  })

  it('counts the thirtieth day and nothing older', () => {
    const onTheLine: Delivery = {
      ...delivery(0, false, 'ORD-EDGE'),
      d: new Date(SEED_NOW.getTime() - 30 * 86400000),
    }
    const aMomentTooOld: Delivery = {
      ...delivery(0, true, 'ORD-OLD'),
      d: new Date(SEED_NOW.getTime() - 30 * 86400000 - 1),
    }
    const out = onTime30([onTheLine, aMomentTooOld])
    expect(out.total).toBe(1)
    expect(out.pct).toBe(100)
  })

  it('says null when nothing was delivered, not zero', () => {
    expect(onTime30([]).pct).toBeNull()
    expect(onTime30([])).toEqual({ pct: null, total: 0, late: 0, rows: [] })

    expect(onTime30([delivery(31, false), delivery(90, true)]).pct).toBeNull()
  })

  it('still says zero when everything in the window was late', () => {
    const out = onTime30([delivery(1, true), delivery(2, true)])
    expect(out.pct).toBe(0)
    expect(out.total).toBe(2)
    expect(out.late).toBe(2)
  })

  it('moves the window with the clock rather than with the data', () => {
    const rows = [delivery(1, false), delivery(2, true)]
    expect(onTime30(rows).total).toBe(2)

    setClock(() => new Date(SEED_NOW.getTime() + 60 * 86400000))
    expect(onTime30(rows).pct, 'a two-month-old delivery is still being counted').toBeNull()
  })
})

describe('the capacity colour', () => {
  it('is one scale, whichever screen draws the bar', () => {
    expect(capacityTone(50)).toEqual({ fill: 'var(--ok)', text: 'gr' })
    expect(capacityTone(80)).toEqual({ fill: 'var(--warn)', text: 'warn' })
    expect(capacityTone(120)).toEqual({ fill: 'var(--bad)', text: 'bad' })
  })

  it('compares strictly, so a load sitting on a threshold keeps the calmer colour', () => {
    expect(capacityTone(CAPACITY_AMBER).fill).toBe('var(--ok)')
    expect(capacityTone(CAPACITY_AMBER + 1).fill).toBe('var(--warn)')
    expect(capacityTone(CAPACITY_RED).fill).toBe('var(--warn)')
    expect(capacityTone(CAPACITY_RED + 1).fill).toBe('var(--bad)')
  })

  it('greys the figure while the bar is green, and colours it with the bar after that', () => {
    expect(capacityTone(50).text).toBe('gr')
    expect(capacityTone(85).text).toBe('warn')
    expect(capacityTone(99).text).toBe('bad')
  })
})

describe('the payroll register', () => {
  const base = payslipOf(must(paidStaff()[0], 'someone on the payroll'), must(PAYMONTHS.at(-1), 'a pay month'))

  const slip = (over: Partial<Payslip>): Payslip => ({ ...base, ...over })
  const person = (over: Partial<Person>): Person => ({ ...base.p, ...over })

  it('writes the nine columns in the order the bank is mapped to', () => {
    const rows = registerRows([
      slip({
        p: person({ n: 'Asha Rao', dep: ['Search', 'Search QC'] }),
        lopDays: 2,
        gross: 90000,
        epf: 1800,
        pt: 200,
        esi: 137,
        tds: 4500,
        net: 83363,
      }),
    ])

    expect(rows[0]).toEqual([
      'Name',
      'Department',
      'Unpaid days',
      'Gross',
      'PF',
      'PT',
      'ESI',
      'TDS',
      'Net pay',
    ])
    expect(rows[1]).toEqual(['Asha Rao', 'Search', 2, 90000, 1800, 200, 137, 4500, 83363])
  })

  it('names one department, the first, rather than joining them', () => {
    const rows = registerRows([
      slip({ p: person({ n: 'No Dept', dep: [] }) }),
      slip({ p: person({ n: 'Two Depts', dep: ['Typing', 'Typing QC'] }) }),
    ])
    expect(rows[1]?.[1]).toBe('')
    expect(rows[2]?.[1]).toBe('Typing')
    expect(rows[1]).toHaveLength(9)
  })

  it('reports the unpaid days attendance recorded, not the joiner’s part month', () => {
    const rows = registerRows([slip({ lopDays: 2, unpaid: 11 })])
    expect(rows[1]?.[2]).toBe(2)
  })

  it('is a header and one row per payslip, with the header there even for none', () => {
    expect(registerRows([])).toEqual([
      ['Name', 'Department', 'Unpaid days', 'Gross', 'PF', 'PT', 'ESI', 'TDS', 'Net pay'],
    ])
    expect(registerRows([slip({}), slip({}), slip({})])).toHaveLength(4)
  })
})
