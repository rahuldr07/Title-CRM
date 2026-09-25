import type { Payslip } from '@/domain/payroll/payroll'
import { payCfgOf } from '@/domain/payroll/payruns'
import type { CsvRow } from '@/shared/lib/csv'
import { bankProblem } from '@/shared/lib/forms'
import { refusal, STAFF_CAPABILITY, type Actor } from '@/domain/auth/permissions'

type StatutoryFile = [label: string, name: string, header: string[], row: (x: Payslip) => (string | number)[]]

export const STATUTORY_FILES: StatutoryFile[] = [
  [
    'PF ECR',
    'pf-ecr',
    ['UAN', 'Name', 'Gross wages', 'EPF wages', 'Employee share', 'Employer share'],
    (x) => [x.p.uan, x.p.n, x.gross, x.st.pfWage, x.epf, x.st.epfEr],
  ],
  [
    'ESI return',
    'esi-return',
    ['ESIC number', 'Name', 'Days', 'Gross wages', 'Employee contribution'],
    (x) => [x.p.esicNo, x.p.n, x.p.doj ? 26 - x.lopDays : 26, x.gross, x.esi],
  ],
  [
    'PT challan',
    'pt-challan',
    ['Name', 'State', 'Gross', 'Professional tax'],
    (x) => [x.p.n, payCfgOf(x.mn).ptState, x.gross, x.pt],
  ],
  [
    'Form 24Q',
    'form-24q',
    ['PAN', 'Name', 'Gross salary', 'Tax deducted'],
    (x) => [x.p.pan, x.p.n, x.gross, x.tds],
  ],
]

const IDENTIFIERS = ['UAN', 'ESIC number', 'PAN', 'Account', 'IFSC']

export const exportRefusal = (actor: Actor, header: readonly string[]): string | null =>
  refusal(actor, 'pricing', 'Exporting a payroll file') ??
  (header.some((h) => IDENTIFIERS.includes(h))
    ? refusal(actor, STAFF_CAPABILITY, `A file carrying ${header.filter((h) => IDENTIFIERS.includes(h)).join(', ')}`)
    : null)

type Exported<T> = ({ rows: CsvRow[]; refused: null } & T) | { rows: null; refused: string }

export function statutoryFile(actor: Actor, [, , header, row]: StatutoryFile, list: Payslip[]): Exported<object> {
  const refused = exportRefusal(actor, header)
  if (refused) return { rows: null, refused }
  return { rows: [header, ...list.map(row)], refused: null }
}

const BANK_HEADER = ['Beneficiary', 'Account', 'IFSC', 'Amount', 'Narration']

export function bankFile(actor: Actor, list: Payslip[], month: string): Exported<{ payable: number; left: number }> {
  const refused = exportRefusal(actor, BANK_HEADER)
  if (refused) return { rows: null, refused }
  const payable = list.filter((x) => bankProblem(x.p.bank) === null)
  return {
    refused: null,
    rows: [
      BANK_HEADER,
      ...payable.map((x) => [x.p.bank.name, x.p.bank.acct, x.p.bank.ifsc.toUpperCase(), x.net, `Salary ${month}`]),
    ],
    payable: payable.length,
    left: list.length - payable.length,
  }
}
