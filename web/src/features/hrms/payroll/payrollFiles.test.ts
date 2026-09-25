import { describe, expect, it } from 'vitest'
import { payTotals } from '@/domain/payroll/payroll'
import { LATEST_PAY_MONTH, payCfgOf } from '@/domain/payroll/payruns'
import { bankProblem } from '@/shared/lib/forms'
import { STATUTORY_FILES, bankFile, statutoryFile } from './payrollFiles'
import { saveRole } from '@/domain/auth/roles'
import type { CsvRow } from '@/shared/lib/csv'
import { must } from '../../../../tests/must'

const list = payTotals(LATEST_PAY_MONTH).list
const first = must(list[0], 'a payslip in the latest month')
const ADMIN = { id: 'hw', r: 'admin' }
const file = (label: string) => must(STATUTORY_FILES.find(([l]) => l === label), label)
function paymaster() {
  const made = saveRole(ADMIN, { n: 'Paymaster', desc: 'Runs payroll', p: ['own', 'pricing'] })
  return { id: 'gk', r: must(made.id, 'the paymaster role') }
}
const rowsOf = (out: { rows: CsvRow[] | null }): CsvRow[] => {
  if (!out.rows) throw new Error('refused')
  return out.rows
}

describe('who may export identifiers', () => {
  it('refuses a file carrying PAN, UAN or ESIC numbers to someone who holds pricing but not people', () => {
    const pm = paymaster()
    for (const label of ['PF ECR', 'ESI return', 'Form 24Q']) {
      expect(statutoryFile(pm, file(label), list)).toMatchObject({ rows: null, refused: expect.stringMatching(/“people”/) })
    }
  })

  it('still gives them the professional-tax challan, which carries no identifier', () => {
    expect(statutoryFile(paymaster(), file('PT challan'), list).refused).toBeNull()
  })

  it('refuses the bank file, with its account numbers and IFSC, to the same person', () => {
    expect(bankFile(paymaster(), list, LATEST_PAY_MONTH)).toMatchObject({ rows: null, refused: expect.stringMatching(/“people”/) })
  })

  it('refuses every file to someone without pricing', () => {
    expect(statutoryFile({ id: 'sk', r: 'lead' }, file('PT challan'), list).refused).toMatch(/“pricing”/)
  })
})

describe('the statutory files', () => {
  it('are the four returns, each with a header as wide as its rows', () => {
    expect(STATUTORY_FILES.map(([label, name]) => [label, name])).toEqual([
      ['PF ECR', 'pf-ecr'],
      ['ESI return', 'esi-return'],
      ['PT challan', 'pt-challan'],
      ['Form 24Q', 'form-24q'],
    ])
    for (const [, , header, row] of STATUTORY_FILES) expect(row(first)).toHaveLength(header.length)
  })

  it('fill each row from the payslip it describes', () => {
    const [pf, esi, pt, tds] = STATUTORY_FILES.map((f) => rowsOf(statutoryFile(ADMIN, f, [first]))[1])
    expect(pf).toEqual([first.p.uan, first.p.n, first.gross, first.st.pfWage, first.epf, first.st.epfEr])
    expect(esi).toEqual([first.p.esicNo, first.p.n, first.p.doj ? 26 - first.lopDays : 26, first.gross, first.esi])
    expect(pt).toEqual([first.p.n, payCfgOf(first.mn).ptState, first.gross, first.pt])
    expect(tds).toEqual([first.p.pan, first.p.n, first.gross, first.tds])
  })

  it('count a person with no joining date as a full 26 days for ESI', () => {
    const esiRow = STATUTORY_FILES[1]?.[3]
    const noDoj = { ...first, lopDays: 3, p: { ...first.p, doj: '' } }
    expect(esiRow?.(noDoj)[2]).toBe(26)
    expect(esiRow?.({ ...noDoj, p: { ...first.p, doj: '2020-01-01' } })[2]).toBe(23)
  })
})

describe('the bank file', () => {
  it('credits only accounts that would not bounce, and counts the rest as left out', () => {
    const out = bankFile(ADMIN, list, LATEST_PAY_MONTH)
    if (!out.rows) throw new Error(out.refused)
    const good = list.filter((x) => bankProblem(x.p.bank) === null)
    expect(out.payable).toBe(good.length)
    expect(out.left).toBe(list.length - good.length)
    expect(rowsOf(out)[0]).toEqual(['Beneficiary', 'Account', 'IFSC', 'Amount', 'Narration'])
    expect(rowsOf(out).slice(1)).toEqual(
      good.map((x) => [x.p.bank.name, x.p.bank.acct, x.p.bank.ifsc.toUpperCase(), x.net, `Salary ${LATEST_PAY_MONTH}`]),
    )
  })

  it('leaves out a person whose account is missing', () => {
    const good = { ...first, p: { ...first.p, bank: { ...first.p.bank, acct: '123456789012', ifsc: 'hdfc0001234' } } }
    const broken = { ...good, p: { ...good.p, bank: { ...good.p.bank, acct: '' } } }
    const out = bankFile(ADMIN, [broken, good], 'Jul 2026')
    expect(out).toMatchObject({ payable: 1, left: 1 })
    expect(out.rows).toEqual([
      ['Beneficiary', 'Account', 'IFSC', 'Amount', 'Narration'],
      [good.p.bank.name, '123456789012', 'HDFC0001234', good.net, 'Salary Jul 2026'],
    ])
  })
})
