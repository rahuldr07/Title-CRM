import { PAYMONTHS } from '@/data/hrms'
import type { Payslip } from '@/domain/payroll/payroll'
import { LATEST_PAY_MONTH, type RunRecord } from '@/domain/payroll/payruns'

export function latestPublished(runs: Record<string, RunRecord>): string {
  return PAYMONTHS.filter((m) => runs[m]?.published).at(-1) ?? LATEST_PAY_MONTH
}

export function filterPayslips(list: Payslip[], only: 'all' | 'lop', query: string): Payslip[] {
  const q = query.trim().toLowerCase()
  return list.filter((x) => {
    if (only === 'lop' && x.unpaid <= 0) return false
    if (!q) return true
    return x.p.n.toLowerCase().includes(q) || x.p.dep.join(' ').toLowerCase().includes(q)
  })
}

interface PayslipSums {
  gross: number
  ded: number
  net: number
  tds: number
  unpaid: number
}

export const sumPayslips = (slips: Payslip[]): PayslipSums =>
  slips.reduce(
    (a, s) => ({
      gross: a.gross + s.gross,
      ded: a.ded + s.totalDed,
      net: a.net + s.net,
      tds: a.tds + s.tds,
      unpaid: a.unpaid + s.unpaid,
    }),
    { gross: 0, ded: 0, net: 0, tds: 0, unpaid: 0 },
  )
