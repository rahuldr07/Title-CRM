import { useStageName } from '@/domain/company/naming'
import { useState } from 'react'
import { useGo } from '@/shared/hooks/useGo'
import { Btn } from '@/shared/ui/Button'
import { PageHead } from '@/shared/ui/PageHead'
import { Tabs } from '@/shared/ui/Tabs'
import { RequireCap } from '@/shared/ui/RequireCap'
import { useUi } from '@/shared/ui/UiProvider'
import { useTimeclock } from '@/domain/attendance/TimeclockProvider'
import { ATT } from '@/data/hrms'
import { useTimeRules } from '@/domain/attendance/timeRules'
import { LATEST_PAY_MONTH } from '@/domain/payroll/payruns'
import { AVAIL } from '@/data/people'
import { hm, ist, worked } from '@/domain/attendance/workingDay'
import { whoName, useStaff } from '@/domain/people/roster'
import { fmtDate, labelOf } from '@/shared/lib/format'
import { now } from '@/shared/lib/clock'
import { csvName, downloadCSV } from '@/shared/lib/csv'
import type { Person } from '@/data/types'
import { onLeaveOn } from '@/domain/leave/leave'
import { TodayTab } from './tabs/TodayTab'
import { RosterTab } from './tabs/RosterTab'
import { MonthTab } from './tabs/MonthTab'
import { LateTab } from './tabs/LateTab'
import { PatternsTab } from './tabs/PatternsTab'
import { HowTab } from './tabs/HowTab'

type Tab = 'Today' | 'Roster' | 'This month' | 'Late logins' | 'Patterns' | 'How it works'


function Attendance() {
  const everyone = useStaff()
  const stageName = useStageName()
  const navigate = useGo()
  const { toast } = useUi()
  const clock = useTimeclock()

  const [tab, setTab] = useState<Tab>('Today')
  const [month, setMonth] = useState(LATEST_PAY_MONTH)
  const [lateFilter, setLateFilter] = useState('all')

  const list = everyone.filter((p) => p.dep.length && p.active !== false)
  const roll = ATT[month] ?? {}
  const today = now()
  const { lateGraceMins } = useTimeRules()

  const openPerson = (id: string) => navigate({ to: '/staff/$personId', params: { personId: id } })

  const openLate = clock.late.filter((x) => !x.waived)

  const inNow = list.filter((p) => {
    const m = clock.markOf(p.id)
    return m && m.in && !m.out
  }).length
  const awayToday = list.filter((p) => onLeaveOn(p.id, today)).length

  const TABS: [Tab, number | null][] = [
    ['Today', clock.waiting || null],
    ['Roster', null],
    ['This month', null],
    ['Late logins', openLate.length || null],
    ['Patterns', null],
    ['How it works', null],
  ]

  const sub =
    tab === 'Today'
      ? `${fmtDate(today)} · ${inNow} of ${list.length} working right now`
      : tab === 'This month'
        ? `${month} · ${list.length} people`
        : tab === 'Roster'
          ? 'The next seven days, with holidays, leave and swaps already in it'
          : tab === 'Late logins'
            ? `Last 30 days · ${lateGraceMins} minutes of grace before a punch counts as late`
            : tab === 'Patterns'
              ? 'Absence worth a conversation, rather than absence in total'
              : 'Sites, shifts, and the rules a day is judged against'

  const exportMonth = () => {
    const out = downloadCSV(csvName(`attendance-${month.replace(' ', '-')}`), [
      ['Employee', 'Department', 'Days in month', 'Working days', 'Present', 'Paid leave', 'Unpaid'],
      ...list.map((p) => {
        const x = roll[p.id]
        return [p.n, stageName(p.dep[0] ?? ''), x?.days, x?.working, x?.present, x?.paidLeave, x?.lop]
      }),
    ])
    toast(`${out.name} — ${out.rows.length - 1} people`)
  }

  const exportLate = () => {
    const out = downloadCSV(csvName('late-logins'), [
      ['Date', 'Who', 'Shift', 'Due in', 'Punched', 'Late by (min)', 'Reason', 'Waived'],
      ...clock.late.map((x) => [
        fmtDate(x.d),
        whoName(x.who),
        x.shift,
        x.due,
        x.at,
        x.mins,
        x.why ?? '',
        x.waived ? 'yes' : '',
      ]),
    ])
    toast(`${out.name} — ${out.rows.length - 1} marks`)
  }

  const stateOf = (p: Person): [string, 'v' | 'b' | 'r' | 'n'] => {
    const m = clock.markOf(p.id)
    if (onLeaveOn(p.id, today)) return ['On leave', 'r']
    if (m && m.in && !m.out) return [`In — since ${ist(m.in)}`, 'v']
    if (m && m.out) return [`Done — ${hm(worked(m))}`, 'b']
    if (p.avail !== 'ok') return [labelOf(AVAIL, p.avail)[0], 'n']
    return ['Not marked', 'n']
  }

  return (
    <>
      <PageHead
        title="Attendance and time"
        sub={sub}
        actions={
          tab === 'This month' ? (
            <Btn variant="ghost" onClick={exportMonth}>
              Export
            </Btn>
          ) : tab === 'Late logins' ? (
            <Btn variant="ghost" onClick={exportLate}>
              Export
            </Btn>
          ) : undefined
        }
      />

      <Tabs tabs={TABS} value={tab} onChange={setTab}>
        {tab === 'Today' ? (
          <TodayTab
            list={list}
            today={today}
            inNow={inNow}
            awayToday={awayToday}
            stateOf={stateOf}
            openPerson={openPerson}
          />
        ) : null}

        {tab === 'Roster' ? <RosterTab list={list} today={today} /> : null}

        {tab === 'This month' ? (
          <MonthTab list={list} month={month} onMonth={setMonth} openPerson={openPerson} />
        ) : null}

        {tab === 'Late logins' ? (
          <LateTab
            list={list}
            today={today}
            filter={lateFilter}
            onFilter={setLateFilter}
            openPerson={openPerson}
          />
        ) : null}

        {tab === 'Patterns' ? <PatternsTab list={list} openPerson={openPerson} /> : null}

        {tab === 'How it works' ? <HowTab /> : null}
      </Tabs>
    </>
  )
}

export default function AttendanceRoute() {
  return (
    <RequireCap cap="all">
      <Attendance />
    </RequireCap>
  )
}
