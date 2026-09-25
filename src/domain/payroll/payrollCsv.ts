import { stageName } from '@/domain/company/naming'
import type { Person } from '@/data/types'
import type { CsvRow } from '@/shared/lib/csv'
import { payslipOf, ytd, type Payslip } from './payroll'
import { words } from './amountInWords'

export function registerRows(list: Payslip[]): CsvRow[] {
  return [
    ['Name', 'Department', 'Unpaid days', 'Gross', 'PF', 'PT', 'ESI', 'TDS', 'Net pay'],
    ...list.map((x) => [
      x.p.n,
      stageName(x.p.dep[0] ?? ''),
      x.lopDays,
      x.gross,
      x.epf,
      x.pt,
      x.esi,
      x.tds,
      x.net,
    ]),
  ]
}

export function payslipRows(person: Person, month: string, company: string): CsvRow[] {
  const s = payslipOf(person, month)
  const y = ytd(person, month)
  return [
    ['Payslip', company, month],
    [],
    ['Employee', person.n],
    ['Employee ID', person.id.toUpperCase()],
    ['Department', person.dep.map((d) => stageName(d)).join(', ')],
    ['Working days', s.a.working],
    ['Paid leave', s.a.paidLeave],
    ['Unpaid days', s.a.lop],
    [],
    ['Earnings', 'Amount'],
    ...s.earn,
    ['Gross earnings', s.gross],
    [],
    ['Deductions', 'Amount'],
    ...s.ded,
    ['Total deductions', s.totalDed],
    [],
    ['Net pay', s.net],
    ['In words', words(s.net)],
    [],
    ['Employer contributions', ''],
    ...s.employer,
    [],
    ['Year to date gross', y.gross],
    ['Year to date deductions', y.ded],
    ['Year to date net', y.net],
  ]
}

export const payslipFileStem = (person: Person, month: string) =>
  `payslip-${person.n.replace(/\s+/g, '-')}-${month.replace(' ', '-')}`

export const registerFileStem = (month: string) => `payroll-register-${month.replace(' ', '-')}`
