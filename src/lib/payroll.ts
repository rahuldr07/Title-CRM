import {
  ARREARS,
  ATT,
  CLAIMS,
  OLDSLABS,
  OLDSTD,
  PAYMONTHS,
  STDDED,
  TAXSLABS,
  TIMECFG,
  LEAVE,
  LEAVETYPES,
} from '@/data/hrms'
import { LOANPAYMENTS, LOANS } from '@/data/loans'
import { loanDeductionsFor, openLoansFor, outstanding, type LoanDeduction } from '@/lib/loans'
import { currentPayCfg, currentStaff } from '@/state/company'
import { runOf } from '@/state/payruns'
import { currentOvertime } from '@/state/overtime'
import { pad, signed } from './format'
import { now } from '@/lib/clock'
import type { PayConfig, Person, RunState } from '@/data/types'
import type { Overtime } from '@/data/hrms'

/* The employer's ESI rate, set by statute alongside the employee's 0.75%. */
const ESI_EMPLOYER_PCT = 3.25

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const inr = (n: number) => signed(n, currentPayCfg().sym, Math.abs(Math.round(n)).toLocaleString('en-IN'))
export const inr2 = (n: number) =>
  signed(
    n,
    currentPayCfg().sym,
    Math.abs(Math.round(n * 100) / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  )

export interface Structure {
  ctc: number
  monthly: number
  basic: number
  hra: number
  special: number
  gross: number
  epfEr: number
  grat: number
  pfWage: number
}

export function structureOf(p: Pick<Person, 'ctc'>, cfg: PayConfig = currentPayCfg()): Structure {
  const ctc = p.ctc ?? 0
  const m = ctc / 12
  const basic = Math.round((m * cfg.basicPct) / 100)
  const hra = Math.round((basic * cfg.hraPctOfBasic) / 100)
  const pfWage = cfg.pfOnFullBasic ? basic : Math.min(basic, cfg.pfWageCeiling)
  const epfEr = Math.round((pfWage * cfg.pfPct) / 100)
  const grat = Math.round((basic * cfg.gratuityPct) / 100)
  const special = Math.max(0, Math.round(m - epfEr - grat - basic - hra))
  return { ctc, monthly: Math.round(m), basic, hra, special, gross: basic + hra + special, epfEr, grat, pfWage }
}

function slabTax(ti: number, slabs: [number, number][], rebateUnder: number): number {
  let tax = 0
  let prev = 0
  for (const [cap, rate] of slabs) {
    if (ti > prev) tax += ((Math.min(ti, cap) - prev) * rate) / 100
    prev = cap
    if (ti <= cap) break
  }
  if (ti <= rebateUnder) tax = 0
  return Math.round(tax * 1.04)
}

export function taxUnder(regime: 'new' | 'old', gross12: number, declared = 0): number {
  if (regime === 'new') return slabTax(Math.max(0, gross12 - STDDED), TAXSLABS, 1200000)
  return slabTax(Math.max(0, gross12 - OLDSTD - declared), OLDSLABS, 500000)
}

export const monthOf = (mmddyyyy: string) => {
  const [m, , y] = mmddyyyy.split('/').map(Number)
  const mon = m === undefined ? undefined : MON[m - 1]
  if (mon === undefined || y === undefined) return ''
  return `${mon} ${y}`
}

export const otMinsFor = (id: string, mn: string, list: Overtime[] = currentOvertime()) =>
  list.filter((o) => o.who === id && o.st === 'approved' && monthOf(o.d) === mn).reduce((a, o) => a + o.mins, 0)

export function otPay(
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
  return Math.round(perHour * (mins / 60) * TIMECFG.otRate)
}

export function payableDays(p: Person, mn: string, working: number): number {
  if (!p.doj) return working
  const [m, d, y] = p.doj.split('/').map(Number)
  const [mon, yr] = mn.split(' ')
  const mi = mon === undefined ? 0 : MON.indexOf(mon) + 1
  const year = Number(yr)
  if (!mi || !year) return working
  if (m === undefined || d === undefined || y === undefined) return working
  if (y > year || (y === year && m > mi)) return 0
  if (y < year || (y === year && m < mi)) return working
  const days = new Date(year, mi, 0).getDate()
  return Math.max(0, Math.round((working * (days - d + 1)) / days))
}

export const claimsFor = (id: string, mn: string) =>
  CLAIMS.filter((c) => c.who === id && c.mn === mn && c.st !== 'rejected' && c.st !== 'pending')

export const arrearsFor = (id: string, mn: string) => ARREARS.filter((a) => a.who === id && a.mn === mn)

export interface PayslipAttendance {
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

/* A closed run answers from what it kept at approval — its settings and its
   roster — so a later change to either cannot rewrite a month already paid. */
export function payslipOf(person: Person, mn: string): Payslip {
  const kept = runOf(mn)?.kept
  const cfg = kept?.cfg ?? currentPayCfg()
  const p = kept?.staff.find((s) => s.id === person.id) ?? person
  const overtime = kept?.ot ?? currentOvertime()
  const st = structureOf(p, cfg)
  const a = ATT[mn]?.[p.id] ?? {
    days: 30,
    working: 26,
    hol: 0,
    lop: 0,
    paidLeave: 0,
    payable: 26,
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
  const loanDeds = loanDeductionsFor(p.id, mn, LOANS, LOANPAYMENTS)
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

/* The Indian financial year runs April to March; a payslip's year to date and
   Form 16 are counted against it, not the calendar year. */
const fyStart = (monthIndex: number, year: number) => (monthIndex >= 3 ? year : year - 1)

const fyLabel = (y: number) => `FY ${y}-${String((y + 1) % 100).padStart(2, '0')}`

export const fyOf = (d: Date): string => fyLabel(fyStart(d.getMonth(), d.getFullYear()))

const fyOfMonth = (mn: string): number => {
  const [mon, yr] = mn.split(' ')
  return fyStart(MON.indexOf(mon ?? ''), Number(yr))
}

/** The financial year a pay month ("May 2026") falls in, as "FY 2026-27". */
export const fyOfPayMonth = (mn: string): string => fyLabel(fyOfMonth(mn))

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

/* Today's roster from the company store, so a CTC edited on the staff form is the
   one payroll pays; a closed run's roster is the one it kept. */
export const paidStaff = (mn?: string): Person[] =>
  ((mn ? runOf(mn)?.kept?.staff : undefined) ?? currentStaff()).filter((x) => x.active !== false && x.ctc)

export interface Balance {
  earned: number
  taken: number
  pending: number
  left: number
  annual: number
}

export function leaveBalance(pid: string): Record<string, Balance> {
  const out: Record<string, Balance> = {}
  LEAVETYPES.forEach((t) => {
    const taken = LEAVE.filter((l) => l.who === pid && l.type === t.k && l.st === 'approved').reduce(
      (a, l) => a + l.days,
      0,
    )
    const pending = LEAVE.filter((l) => l.who === pid && l.type === t.k && l.st === 'pending').reduce(
      (a, l) => a + l.days,
      0,
    )
    const earned =
      t.k === 'co'
        ? LEAVE.filter((l) => l.who === pid && l.type === 'co').length + 2
        : Math.round((t.annual * (now().getMonth() + 1)) / 12)
    out[t.k] = { earned, taken, pending, left: Math.max(0, earned - taken - pending), annual: t.annual }
  })
  return out
}

export function yearsServed(p: Person): number | null {
  if (!p.doj) return null
  const [m, d, y] = p.doj.split('/').map(Number)
  if (m === undefined || d === undefined || y === undefined) return null
  return (now().getTime() - new Date(y, m - 1, d).getTime()) / (365.25 * 24 * 3600 * 1000)
}

export function settlement(p: Person, lastDay?: Date) {
  const st = structureOf(p)
  const lastMn = PAYMONTHS[PAYMONTHS.length - 1]
  const a = lastMn === undefined ? undefined : ATT[lastMn]?.[p.id]
  const yrs = yearsServed(p)
  const perDay = st.gross / Math.max(1, a?.working ?? 26)
  const dayOfMonth = lastDay ? lastDay.getDate() : now().getDate()
  const salary = Math.round(perDay * Math.round(((a?.working ?? 26) * dayOfMonth) / 30))
  const bal = leaveBalance(p.id)
  const plLeft = bal.pl?.left ?? 0
  const encash = Math.round((plLeft * st.basic) / 26)
  const grat = yrs !== null && yrs >= 5 ? Math.round(((st.basic * 15) / 26) * Math.floor(yrs)) : 0
  const open = openLoansFor(p.id, LOANS)
  const advance = open.length ? -open.reduce((a2, l) => a2 + outstanding(l), 0) : 0

  const lines: [string, number][] = [
    ['Salary to the last working day', salary],
    [`Leave encashment — ${plLeft} day${plLeft === 1 ? '' : 's'} of paid leave`, encash],
    [
      yrs === null
        ? 'Gratuity — no joining date on record'
        : yrs < 5
          ? `Gratuity — ${yrs.toFixed(1)} years served, under the five-year threshold`
          : `Gratuity — ${Math.floor(yrs)} completed years at 15 days of basic`,
      grat,
    ],
  ]
  if (advance) lines.push(['Advance outstanding, recovered', advance])

  return { lines, yrs, total: lines.reduce((a2, l) => a2 + l[1], 0), st, bal }
}

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

/* Every deduction the total carries, so a tile that lists them adds up to its own figure. */
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

/** What the month costs the company: gross plus the employer's PF, ESI and gratuity. */
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

export function words(n: number): string {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
    'Eighteen', 'Nineteen',
  ]
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const word = (table: string[], i: number) => table[i] ?? ''
  const two = (x: number): string =>
    x < 20 ? word(ones, x) : word(tens, Math.floor(x / 10)) + (x % 10 ? ` ${word(ones, x % 10)}` : '')
  const three = (x: number): string =>
    x > 99 ? `${word(ones, Math.floor(x / 100))} Hundred${x % 100 ? ` ${two(x % 100)}` : ''}` : two(x)

  const v = Math.round(n)
  if (!v) return 'Zero'
  const abs = Math.abs(v)
  const cr = Math.floor(abs / 10000000)
  const lk = Math.floor((abs % 10000000) / 100000)
  const th = Math.floor((abs % 100000) / 1000)
  const rest = abs % 1000
  return (
    (v < 0 ? 'Minus ' : '') +
    [
      cr ? `${three(cr)} Crore` : '',
      lk ? `${three(lk)} Lakh` : '',
      th ? `${three(th)} Thousand` : '',
      rest ? three(rest) : '',
    ]
      .filter(Boolean)
      .join(' ') + ' Only'
  )
}
