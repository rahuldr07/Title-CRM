import { Card } from '@/shared/ui/Card'
import { MatrixTable, Th } from '@/shared/ui/MatrixTable'
import { useTimeclock } from '@/domain/attendance/TimeclockProvider'
import { HOLIDAYS } from '@/data/people'
import { ist, shiftHours, shiftOf } from '@/domain/attendance/workingDay'
import { fmtDate, iso, usDate } from '@/shared/lib/format'
import type { Person } from '@/data/types'
import { onLeaveOn } from '@/domain/leave/leave'
import { Note } from '@/shared/ui/Layout'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function RosterTab({ list, today }: { list: Person[]; today: Date }) {
  const clock = useTimeclock()

  const days = [...Array(7)].map(
    (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + i),
  )
  const holidayOn = (d: Date) => HOLIDAYS.find((h) => h.d === usDate(d))
  const swapOn = (p: Person, d: Date) =>
    clock.swaps.find((x) => x.st === 'approved' && x.d === usDate(d) && (x.from === p.id || x.to === p.id))

  return (
    <>
      <Card>
        <div className="tsc">
          <MatrixTable label="Who works which shift over the next seven days" min={220 + 7 * 104}>
            <thead>
              <tr>
                <Th style={{ minWidth: 190 }}>Who</Th>
                {days.map((d) => {
                  const h = holidayOn(d)
                  return (
                    <Th key={iso(d)} style={{ textAlign: 'center', minWidth: 96 }}>
                      {DAY_NAMES[d.getDay()]}
                      <div className="gr" style={{ fontWeight: 400, fontSize: 'var(--t-label)' }}>
                        {fmtDate(d)}
                      </div>
                      {h ? (
                        <div className="chip n" style={{ fontSize: 'var(--t-eyebrow)', marginTop: 3 }}>
                          {h.n.split(' ')[0]}
                        </div>
                      ) : null}
                    </Th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const sh = shiftOf(p)
                return (
                  <tr key={p.id}>
                    <td>
                      <b>{p.n}</b>
                      <div className="gr" style={{ fontSize: 'var(--t-label)' }}>
                        {sh.n} · {shiftHours(sh)}
                      </div>
                    </td>
                    {days.map((d) => {
                      const h = holidayOn(d)
                      const off = onLeaveOn(p.id, d)
                      const sw = swapOn(p, d)
                      const rest = d.getDay() === 0
                      return (
                        <td key={iso(d)} style={{ textAlign: 'center' }}>
                          {h && !h.opt ? (
                            <span className="chip n" style={{ fontSize: 'var(--t-eyebrow)' }}>
                              Holiday
                            </span>
                          ) : off ? (
                            <span className="chip r" style={{ fontSize: 'var(--t-eyebrow)' }}>
                              Leave
                            </span>
                          ) : rest ? (
                            <span className="gr" style={{ fontSize: 'var(--t-label)' }}>
                              rest
                            </span>
                          ) : sw ? (
                            <span className="chip b" style={{ fontSize: 'var(--t-eyebrow)' }}>
                              Swap
                            </span>
                          ) : (
                            <span className="mono gr" style={{ fontSize: 'var(--t-label)' }}>
                              {ist(sh.from)}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </MatrixTable>
        </div>
      </Card>
      <Note top={10}>
        Seven days ahead, with holidays, approved leave and agreed swaps already in it. This is the
        view a person checks before asking for a day — and the one a lead checks before approving one.
      </Note>
    </>
  )
}
