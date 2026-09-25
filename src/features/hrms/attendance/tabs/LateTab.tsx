import { Assumption, Empty } from '@/shared/ui/Banner'
import { Avatar } from '@/shared/ui/Avatar'
import { Btn, Pill } from '@/shared/ui/Button'
import { Kpi, Kpis } from '@/shared/ui/Kpi'
import { SectionHead } from '@/shared/ui/PageHead'
import { useUi } from '@/shared/ui/UiProvider'
import { useTimeclock } from '@/domain/attendance/TimeclockProvider'
import { useTimeRules } from '@/domain/attendance/timeRules'
import { hm, ist, shiftOf } from '@/domain/attendance/workingDay'
import { whoName } from '@/domain/people/roster'
import type { Person } from '@/data/types'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { fmtDate } from '@/shared/lib/format'
import { Inline, Note } from '@/shared/ui/Layout'

const REPEAT_AT = 3

export function LateTab({
  list,
  today,
  filter,
  onFilter,
  openPerson,
}: {
  list: Person[]
  today: Date
  filter: string
  onFilter: (f: string) => void
  openPerson: (id: string) => void
}) {
  const { toast } = useUi()
  const clock = useTimeclock()
  const { lateGraceMins } = useTimeRules()

  const open = clock.late.filter((x) => !x.waived)
  const waived = clock.late.filter((x) => x.waived)
  const thisMonth = open.filter((x) => x.d.getMonth() === today.getMonth())
  const minsLost = open.reduce((a, x) => a + x.mins, 0)

  const byPerson = list
    .map((p) => {
      const mine = open.filter((x) => x.who === p.id)
      return {
        p,
        n: mine.length,
        mins: mine.reduce((a, x) => a + x.mins, 0),
        worst: mine.reduce((a, x) => Math.max(a, x.mins), 0),
        last: mine[0] ?? null,
      }
    })
    .filter((x) => x.n)
    .sort((a, b) => b.n - a.n)

  const repeat = byPerson.filter((x) => x.n >= REPEAT_AT)
  const rows =
    filter === 'repeat'
      ? open.filter((x) => repeat.some((r) => r.p.id === x.who))
      : filter === 'unexplained'
        ? open.filter((x) => !x.why)
        : filter === 'waived'
          ? waived
          : open

  const filters: [string, string, number][] = [
    ['all', 'All', open.length],
    ['repeat', 'Repeats', open.filter((x) => repeat.some((r) => r.p.id === x.who)).length],
    ['unexplained', 'No reason given', open.filter((x) => !x.why).length],
    ['waived', 'Waived', waived.length],
  ]

  return (
    <>
      <Kpis>
        <Kpi
          title="Late this month"
          value={<span className={thisMonth.length ? 'warn' : 'ok'}>{thisMonth.length}</span>}
          tone={thisMonth.length ? 'warn' : undefined}
          detail={`${open.length} across the last 30 days`}
          onClick={() => onFilter('all')}
        />
        <Kpi title="People affected" value={byPerson.length} detail={`of ${list.length} on the team`} />
        <Kpi
          title="Repeatedly late"
          value={<span className={repeat.length ? 'bad' : 'ok'}>{repeat.length}</span>}
          tone={repeat.length ? 'alert' : undefined}
          detail={`${REPEAT_AT} or more times in the range`}
          onClick={() => onFilter('repeat')}
        />
        <Kpi
          title="Time lost"
          value={hm(minsLost)}
          detail="against shift starts"
          onClick={() => onFilter('unexplained')}
        />
      </Kpis>

      {repeat.length ? (
        <div className="bnr r">
          <span className="bi">◷</span>
          <div>
            <div className="bt">
              {repeat.length} {repeat.length === 1 ? 'person is' : 'people are'} late often enough to be
              a pattern
            </div>
            {repeat.map((x) => `${x.p.n} — ${x.n} times, worst ${x.worst} minutes`).join(' · ')}. A
            pattern is usually a shift that does not fit someone’s commute or household, not a
            discipline problem. The useful next step is asking, and moving them to a shift that works —
            not a warning.
          </div>
        </div>
      ) : (
        <div className="bnr v">
          <span className="bi">✓</span>
          <div>
            <div className="bt">Nobody is repeatedly late</div>
            Every late mark in range is a one-off. Worth leaving alone.
          </div>
        </div>
      )}

      <SectionHead>Person by person</SectionHead>
      <FlexTable
        cols="200px 130px 90px 100px 110px 1fr"
        min={880}
        head={['Name', 'Shift', 'Times', 'Total late', 'Worst', 'Most recent']}
      >
        {byPerson.length ? (
          byPerson.map((x) => {
            const sh = shiftOf(x.p)
            return (
              <FlexRow key={x.p.id} onClick={() => openPerson(x.p.id)}>
                <Cell>
                  <Inline gap={8}>
                    <Avatar name={x.p.n} />
                    <div className="v">{x.p.n}</div>
                  </Inline>
                </Cell>
                <Cell>
                  <div className="v gr" style={{ fontSize: 'var(--t-small)' }}>
                    {sh.n}
                    <div className="mono" style={{ fontSize: 'var(--t-label)' }}>
                      from {ist(sh.from)}
                    </div>
                  </div>
                </Cell>
                <Cell>
                  <div className={`v mono ${x.n >= REPEAT_AT ? 'bad' : ''}`}>{x.n}</div>
                </Cell>
                <Cell>
                  <div className="v mono">{hm(x.mins)}</div>
                </Cell>
                <Cell>
                  <div className={`v mono ${x.worst >= 45 ? 'warn' : 'gr'}`}>{x.worst}m</div>
                </Cell>
                <Cell>
                  <div className="v" style={{ fontSize: 'var(--t-small)' }}>
                    {x.last ? `${fmtDate(x.last.d)} · in at ${ist(x.last.at)}` : '—'}
                    <div className="s">
                      {x.last?.why ?? <span className="gr">no reason given</span>}
                    </div>
                  </div>
                </Cell>
              </FlexRow>
            )
          })
        ) : (
          <Empty icon="☰">Nobody has been late in this range.</Empty>
        )}
      </FlexTable>

      <SectionHead>Every late punch</SectionHead>
      <div className="fbar" role="group" aria-label="Filter late logins">
        {filters.map(([k, label, n]) => (
          <Pill key={k} on={filter === k} onClick={() => onFilter(k)}>
            {label} <span className="mono">{n}</span>
          </Pill>
        ))}
      </div>
      <FlexTable
        cols="110px 180px 120px 100px 90px 1fr 100px"
        min={900}
        head={['Date', 'Who', 'Due in', 'Punched', 'Late by', 'Reason given', '']}
      >
        {rows.length ? (
          rows.map((x) => (
            <FlexRow key={x.id} style={{ ...(x.waived ? { opacity: 0.55 } : {}) }}>
              <Cell>
                <div className="v mono">{fmtDate(x.d)}</div>
              </Cell>
              <Cell>
                <Inline gap={8}>
                  <Avatar name={whoName(x.who)} />
                  <div className="v">{whoName(x.who)}</div>
                </Inline>
              </Cell>
              <Cell>
                <div className="v mono gr">
                  {ist(x.due)}
                  <span style={{ fontSize: 'var(--t-label)' }}> · {x.shift}</span>
                </div>
              </Cell>
              <Cell>
                <div className="v mono">{ist(x.at)}</div>
              </Cell>
              <Cell>
                <div className={`v mono ${x.mins >= 45 ? 'bad' : 'warn'}`}>{x.mins}m</div>
              </Cell>
              <Cell>
                <div className="v" style={{ fontSize: 'var(--t-small)' }}>
                  {x.why ?? <span className="gr">none</span>}
                </div>
              </Cell>
              <Cell>
                <Btn
                  variant="ghost"
                  small
                  onClick={() => {
                    const next = !x.waived
                    toast(clock.setWaived(x.id, next) ?? (next ? 'Waived — it stays in the log' : 'Waiver removed'))
                  }}
                >
                  {x.waived ? 'Undo' : 'Waive'}
                </Btn>
              </Cell>
            </FlexRow>
          ))
        ) : (
          <Empty icon="☰">Nothing in this filter.</Empty>
        )}
      </FlexTable>
      <Assumption title="Waiving is a record, not an erasure">
        A waived mark stays in the log and in the export — it simply stops counting towards the
        pattern. <b>Attendance figures people cannot see the workings of are the ones they stop
        trusting</b>, so nothing here is deleted, only annotated.
      </Assumption>
      <Note top={12}>
        The grace period is {lateGraceMins} minutes, set under <b>How it works</b>. A punch
        inside it is not recorded as late at all.
      </Note>
    </>
  )
}
