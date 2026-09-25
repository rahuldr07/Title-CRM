import { currentStaff, findPerson } from '@/domain/people/roster'
import { ARREARS, ATT, CLAIMS, PAYMONTHS, type Overtime } from '@/data/hrms'
import { currentLoanPayments, currentLoans } from '@/domain/loans/loanStore'
import { loanDeductionsFor, type LoanDeduction } from '@/domain/loans/loans'
import { currentPayCfg } from '@/domain/company/company'
import { payCfgOf, runOf } from './payruns'
import { currentOvertime } from './overtime'
import { structureOf, taxUnder, type Structure } from './structure'
import { fyOfMonth } from './fiscalYear'
import { MONTHS, monthLabel, pad } from '@/shared/lib/format'
import { currentTimeRules } from '@/domain/attendance/timeRules'
import type { PayConfig, Person, RunState } from '@/data/types'

const ESI_EMPLOYER_PCT = 3.25

const monthOf = (mmddyyyy: string) => {
  const [m, , y] = mmddyyyy.split('/').map(Number)
  if (m === undefined || y === undefined || MONTHS[m - 1] === undefined) return ''
  return monthLabel(new Date(y, m - 1, 1))
}

const otMinsFor = (id: string, mn: string, list: Overtime[] = currentOvertime()) =>
  list.filter((o) => o.who === id && o.st === 'approved' && monthOf(o.d) === mn).reduce((a, o) => a + o.mins, 0)

function otPay(
  p: Person,
  mn: string,
  cfg: PayConfig = currentPayCfg(),
  list: Overtime[] = currentOvertime(),
): number {
  const mins = otMinsFor(p.id, mn, list)
  if (!mins) return 0
  const s = structureOf(p, cfg)
  const a = ATT[mn]?.[p.id]
  const perHour = s.gross / Math.max(1, a?.working ?? 26) / 8
  return Math.round(perHour * (mins / 60) * currentTimeRules().otRate)
}

function payableDays(p: Person, mn: string, working: number): number {
  if (!p.doj) return working
  const [m, d, y] = p.doj.split('/').map(Number)
  const [mon, yr] = mn.split(' ')
  const mi = mon === undefined ? 0 : MONTHS.indexOf(mon) + 1
  const year = Number(yr)
  if (!mi || !year) return working
  if (m === undefined || d === undefined || y === undefined) return working
  if (y > year || (y === year && m > mi)) return 0
  if (y < year || (y === year && m < mi)) return working
  const days = new Date(year, mi, 0).getDate()
  return Math.max(0, Math.round((working * (days - d + 1)) / days))
}

const claimsFor = (id: string, mn: string) =>
  CLAIMS.filter((c) => c.who === id && c.mn === mn && c.st !== 'rejected' && c.st !== 'pending')

const arrearsFor = (id: string, mn: string) => ARREARS.filter((a) => a.who === id && a.mn === mn)

interface PayslipAttendance {
  days: number
  working: number
  paidLeave: number
  lop: number
}

export interface Payslip {
  p: Person
  mn: string
  st: Structure
  a: PayslipAttendance
  perDay: number
  loanDeds: LoanDeduction[]
  arr: number
  lopDays: number
  unpaid: number
  lopAmt: number
  earn: [string, number][]
  ded: [string, number][]
  reimb: [string, number][]
  employer: [string, number][]
  gross: number
  epf: number
  esi: number
  esiEr: number
  pt: number
  tds: number
  totalDed: number
  claims: number
  net: number
}

export function payslipOf(person: Person, mn: string): Payslip {
  const kept = runOf(mn)?.kept
  const cfg = payCfgOf(mn)
  const p = findPerson(kept?.staff ?? [], person.id) ?? person
  const overtime = kept?.ot ?? currentOvertime()
  const st = structureOf(p, cfg)
  const a = ATT[mn]?.[p.id] ?? {
    days: 30,
    working: 26,
    hol: 0,
    lop: 0,
    paidLeave: 0,
    payable: payableDays(p, mn, 26),
    joined: false,
    present: 26,
  }
  const perDay = st.gross / Math.max(1, a.working)
  const unpaid = a.lop + Math.max(0, a.working - (a.payable ?? a.working))
  const lopAmt = Math.round(perDay * unpaid)
  const f = a.working ? 1 - unpaid / a.working : 1

  const basic = Math.round(st.basic * f)
  const hra = Math.round(st.hra * f)
  const special = Math.round(st.special * f)
  const gross = basic + hra + special

  const pfWage = cfg.pfOnFullBasic ? basic : Math.min(basic, cfg.pfWageCeiling)
  const epf = Math.round((pfWage * cfg.pfPct) / 100)
  const esi = gross <= cfg.esiGrossLimit ? Math.round((gross * cfg.esiPct) / 100) : 0
  const esiEr = esi ? Math.round((gross * ESI_EMPLOYER_PCT) / 100) : 0
  const pt = gross > 0 ? cfg.ptAmount : 0
  const tds = Math.round(taxUnder(cfg.regime, st.gross * 12) / 12)

  const arrRows = arrearsFor(p.id, mn)
  const arr = arrRows.reduce((acc, x) => acc + x.amt, 0)
  const cl = claimsFor(p.id, mn).reduce((acc, x) => acc + x.amt, 0)
  const loanDeds = loanDeductionsFor(
    p.id,
    mn,
    kept?.loans ?? currentLoans(),
    kept?.payments ?? currentLoanPayments(),
    !!kept,
  )
  const loanTotal = loanDeds.reduce((a, d) => a + d.amount, 0)
  const ded = epf + esi + pt + tds + loanTotal

  const ot = otPay(p, mn, cfg, overtime)
  const otm = otMinsFor(p.id, mn, overtime)

  const earn: [string, number][] = [
    ['Basic', basic],
    ['House rent allowance', hra],
    ['Special allowance', special],
  ]
  if (ot) earn.push([`Overtime — ${Math.floor(otm / 60)}h ${pad(otm % 60)}m approved`, ot])
  const firstArr = arrRows[0]
  if (arr && firstArr) earn.push([`Arrears — ${firstArr.what}`, arr])

  const dedRows: [string, number][] = [
    ['Provident fund (employee)', epf],
    [`Professional tax — ${cfg.ptState}`, pt],
  ]
  if (esi) dedRows.push(['ESI (employee)', esi])
  dedRows.push(['Income tax (TDS)', tds])
  for (const d of loanDeds) dedRows.push([d.loan.kind === 'loan' ? 'Loan EMI' : 'Advance recovery', d.amount])

  const grossPay = gross + arr + ot
  return {
    p,
    mn,
    st,
    a: { days: a.days, working: a.working, paidLeave: a.paidLeave, lop: a.lop },
    perDay,
    loanDeds,
    arr,
    lopDays: a.lop,
    unpaid,
    lopAmt,
    earn,
    ded: dedRows,
    reimb: claimsFor(p.id, mn).map((c) => [c.what, c.amt] as [string, number]),
    employer: [
      ['Provident fund (employer)', st.epfEr],
      ...(esiEr ? [['ESI (employer)', esiEr] as [string, number]] : []),
      ['Gratuity provision', st.grat],
    ],
    gross: grossPay,
    epf,
    esi,
    esiEr,
    pt,
    tds,
    totalDed: ded,
    claims: cl,
    net: grossPay - ded + cl,
  }
}

export function ytd(p: Person, mn: string) {
  const fy = fyOfMonth(mn)
  const upto = PAYMONTHS.slice(0, PAYMONTHS.indexOf(mn) + 1).filter((m) => fyOfMonth(m) === fy)
  return upto.reduce(
    (acc, m) => {
      const s = payslipOf(p, m)
      acc.gross += s.gross
      acc.ded += s.totalDed
      acc.net += s.net
      acc.tds += s.tds
      acc.months += 1
      return acc
    },
    { gross: 0, ded: 0, net: 0, tds: 0, months: 0 },
  )
}

export const paidStaff = (mn?: string): Person[] =>
  ((mn ? runOf(mn)?.kept?.staff : undefined) ?? currentStaff()).filter((x) => x.active !== false && x.ctc)

export interface PayTotals {
  list: Payslip[]
  gross: number
  ded: number
  net: number
  pf: number
  erpf: number
  esi: number
  esiEr: number
  pt: number
  tds: number
  grat: number
  loans: number
  claims: number
  lop: Payslip[]
}

export function payTotals(mn: string): PayTotals {
  const list = paidStaff(mn).map((p) => payslipOf(p, mn))
  const sum = (f: (x: Payslip) => number) => list.reduce((a, x) => a + f(x), 0)
  return {
    list,
    gross: sum((x) => x.gross),
    ded: sum((x) => x.totalDed),
    net: sum((x) => x.net),
    pf: sum((x) => x.epf),
    erpf: sum((x) => x.st.epfEr),
    esi: sum((x) => x.esi),
    esiEr: sum((x) => x.esiEr),
    pt: sum((x) => x.pt),
    tds: sum((x) => x.tds),
    grat: sum((x) => x.st.grat),
    loans: sum((x) => x.loanDeds.reduce((a, d) => a + d.amount, 0)),
    claims: sum((x) => x.claims),
    lop: list.filter((x) => x.unpaid > 0),
  }
}

export function deductionParts(t: PayTotals): [string, number][] {
  return (
    [
      ['PF', t.pf],
      ['ESI', t.esi],
      ['PT', t.pt],
      ['TDS', t.tds],
      ['Loans', t.loans],
    ] as [string, number][]
  ).filter(([, v]) => v)
}

export const companyCost = (t: PayTotals): number => t.gross + t.erpf + t.esiEr + t.grat

export const stepIndex = (state: string): number =>
  ({ draft: 0, locked: 2, approved: 4, paid: 5 })[state] ?? 0

export const nextRunAction = (state: string): [label: string, to: RunState] | null =>
  state === 'draft'
    ? ['Lock attendance', 'locked']
    : state === 'locked'
      ? ['Approve payroll', 'approved']
      : state === 'approved'
        ? ['Publish payslips', 'paid']
        : null
