import { ATT, PAYMONTHS } from '@/data/hrms'
import { currentLoans } from '@/domain/loans/loanStore'
import { openLoansFor, outstanding } from '@/domain/loans/loans'
import { leaveBalance } from '@/domain/leave/balance'
import { now } from '@/shared/lib/clock'
import type { Person } from '@/data/types'
import { structureOf } from './structure'

function yearsServed(p: Person): number | null {
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
  const open = openLoansFor(p.id, currentLoans())
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
