import { useStageName } from '@/domain/company/naming'
import { Avatar } from '@/shared/ui/Avatar'
import { Chip } from '@/shared/ui/Chip'
import { Kpi, Kpis } from '@/shared/ui/Kpi'
import { SectionHead } from '@/shared/ui/PageHead'
import { useTimeclock } from '@/domain/attendance/TimeclockProvider'
import { ATT, PAYMONTHS } from '@/data/hrms'
import { whoName } from '@/domain/people/roster'
import type { Person } from '@/data/types'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { fmtUsDate } from '@/shared/lib/format'
import { ist } from '@/domain/attendance/workingDay'
import { Inline, Note } from '@/shared/ui/Layout'
import { Pill } from '@/shared/ui/Button'

export function MonthTab({
  list,
  month,
  onMonth,
  openPerson,
}: {
  list: Person[]
  month: string
  onMonth: (m: string) => void
  openPerson: (id: string) => void
}) {
  const clock = useTimeclock()
  const stageName = useStageName()

  const A = ATT[month] ?? {}
  const tot = list.reduce(
    (a, p) => {
      const x = A[p.id] ?? { present: 0, lop: 0, paidLeave: 0, working: 0 }
      return {
        present: a.present + x.present,
        lop: a.lop + x.lop,
        leave: a.leave + x.paidLeave,
        working: a.working + x.working,
      }
    },
    { present: 0, lop: 0, leave: 0, working: 0 },
  )

  return (
    <>
      <div className="fbar" role="group" aria-label="Month">
        {PAYMONTHS.map((m) => (
          <Pill key={m} on={month === m} onClick={() => onMonth(m)}>
            {m}
          </Pill>
        ))}
      </div>

      <Kpis>
        <Kpi title="Days worked" value={tot.present} detail={`of ${tot.working} possible`} />
        <Kpi title="On leave" value={tot.leave} detail="paid, against balance" />
        <Kpi
          title="Unpaid days"
          value={<span className={tot.lop ? 'warn' : 'ok'}>{tot.lop}</span>}
          tone={tot.lop ? 'warn' : undefined}
          detail="these become payslip deductions"
        />
        <Kpi title="Punches logged" value={clock.punches.length} detail="with location" />
      </Kpis>

      <SectionHead>Person by person</SectionHead>
      <FlexTable
        cols="190px 130px 100px 100px 100px 1fr"
        min={920}
        head={['Name', 'Department', 'Present', 'Leave', 'Unpaid', 'Of the working days']}
      >
        {list.map((p) => {
          const x = A[p.id] ?? { present: 0, lop: 0, paidLeave: 0, working: 0 }
          const pct = x.working ? Math.round((x.present / x.working) * 100) : 0
          return (
            <FlexRow key={p.id} onClick={() => openPerson(p.id)}>
              <Cell>
                <Inline gap={8}>
                  <Avatar name={p.n} />
                  <div className="v">{p.n}</div>
                </Inline>
              </Cell>
              <Cell>
                <div className="v gr" style={{ fontSize: 'var(--t-small)' }}>
                  {stageName(p.dep[0] ?? '—')}
                </div>
              </Cell>
              <Cell>
                <div className="v mono">{x.present}</div>
              </Cell>
              <Cell>
                <div className={`v mono ${x.paidLeave ? '' : 'gr'}`}>{x.paidLeave || '—'}</div>
              </Cell>
              <Cell>
                <div className={`v mono ${x.lop ? 'warn' : 'gr'}`}>{x.lop || '—'}</div>
              </Cell>
              <Cell>
                <span className="split">
                  <span style={{ width: `${pct}%`, background: 'var(--ok)' }} />
                  <span style={{ width: `${100 - pct}%`, background: 'var(--warn)' }} />
                </span>
                <div className="s">
                  {pct}% of {x.working}
                </div>
              </Cell>
            </FlexRow>
          )
        })}
      </FlexTable>
      <Note top={10}>
        This is the same attendance the payroll run reads — there is no second set of numbers. An
        approved correction is kept beside the punches for the day; it does not change these totals.
      </Note>

      {clock.punches.length ? (
        <>
          <SectionHead>Punch log — {clock.punches.length}</SectionHead>
          <FlexTable
            cols="110px 180px 90px 100px 1fr"
            min={720}
            head={['Date', 'Who', 'Time', 'In or out', 'Where']}
          >
            {clock.punches.slice(0, 25).map((l, i) => (
              <FlexRow key={`${l.who}-${l.t}-${i}`}>
                <Cell>
                  <div className="v mono" style={{ fontSize: 'var(--t-small)' }}>
                    {fmtUsDate(l.d)}
                  </div>
                </Cell>
                <Cell>
                  <div className="v" style={{ fontSize: 'var(--t-small)' }}>
                    {whoName(l.who)}
                  </div>
                </Cell>
                <Cell>
                  <div className="v mono">{ist(l.t)}</div>
                </Cell>
                <Cell>
                  <Chip kind={l.kind === 'in' ? 'v' : 'n'}>{l.kind === 'in' ? 'In' : 'Out'}</Chip>
                </Cell>
                <Cell>
                  <div className={`v ${l.inside ? '' : 'warn'}`} style={{ fontSize: 'var(--t-small)' }}>
                    {l.inside ? '✓ ' : '◷ '}
                    {l.where}
                    {l.acc ? ` · ±${l.acc} m` : ''}
                  </div>
                </Cell>
              </FlexRow>
            ))}
          </FlexTable>
          <Note top={10}>
            Every punch is kept with where it was made. A correction cannot delete one — it adds an
            approved change on top, so the original is still there.
          </Note>
        </>
      ) : null}
    </>
  )
}
