import { useState } from 'react'
import { useGo } from '@/shared/hooks/useGo'
import { Btn, Pill } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Kpi, Kpis } from '@/shared/ui/Kpi'
import { PageHead } from '@/shared/ui/PageHead'
import { Seg } from '@/shared/ui/Tabs'
import { useSession } from '@/domain/auth/SessionProvider'
import { useUi } from '@/shared/ui/UiProvider'
import { cancelLeave, decideLeave, useLeave, useLeavePolicy, useLeaveTypes } from '@/domain/leave/leaveStore'
import { useLeaveBalance } from '@/domain/leave/balance'
import { approvesFor, leaveCheck, managerOf } from '@/domain/leave/leave'
import { fmtDate } from '@/shared/lib/format'
import { now } from '@/shared/lib/clock'
import { LeaveForm } from '@/features/hrms/leave/forms/LeaveForm'
import { LeaveAlerts } from './LeaveAlerts'
import { LeavePolicy } from './LeavePolicy'
import { COLS, LeaveRow } from './LeaveRow'
import { LeaveTypesCard } from './LeaveTypesCard'
import type { Leave } from '@/data/types'
import { whoName, useStaff } from '@/domain/people/roster'
import { FlexTable } from '@/shared/ui/FlexTable'
import { Note } from '@/shared/ui/Layout'

const PAGE = 40

function LeaveScreen() {
  const staff = useStaff()
  const navigate = useGo()
  const { me, can } = useSession()
  const { toast, openModal, closeModal } = useUi()

  const requests = useLeave()
  const types = useLeaveTypes()
  const policy = useLeavePolicy()
  const [filter, setFilter] = useState('pending')
  const [sub, setSub] = useState<'Requests' | 'Policy'>('Requests')

  const mine = !can('all')
  const scope = mine ? requests.filter((l) => l.who === me.id) : requests
  const rows = filter === 'all' ? scope : scope.filter((l) => l.st === filter)

  const balance = useLeaveBalance(me.id)
  const manager = managerOf(me)
  const reportsToMe = approvesFor(me.id)
  const waitingOnMe = requests.filter((l) => l.st === 'pending' && reportsToMe.some((x) => x.id === l.who))
  const pendingAll = requests.filter((l) => l.st === 'pending')

  const decide = (id: string, st: 'approved' | 'rejected') => {
    const l = requests.find((x) => x.id === id)
    if (!l) return
    const refused = decideLeave(me, id, st)
    toast(refused ?? `${whoName(l.who)} — ${st === 'approved' ? 'approved' : 'declined'}`)
  }

  const cancel = (l: Leave) => {
    const started = l.from < now()
    const type = types.find((t) => t.k === l.type)
    openModal({
      title: started ? 'That leave has already started' : 'Cancel this leave?',
      body: started ? (
        <>
          <Note plain size="body">
            It began on {fmtDate(l.from)}. Cancelling it now would rewrite attendance that has already
            been counted, and possibly a payslip that has already gone out.
          </Note>
          <Note>
            Raise it as an attendance correction instead, so the change is recorded rather than silently
            applied.
          </Note>
        </>
      ) : (
        <>
          <Note plain size="body">
            {l.days} day{l.days === 1 ? '' : 's'} of {type?.n ?? l.type} from {fmtDate(l.from)}.
          </Note>
          <Note>
            The balance goes straight back. Whoever approved it is not told automatically — worth a word
            if it was hard to arrange cover.
          </Note>
        </>
      ),
      footer: started ? (
        <>
          <Btn variant="ghost" onClick={closeModal}>
            Close
          </Btn>
          <Btn
            onClick={() => {
              closeModal()
              navigate({ to: '/attend' })
            }}
          >
            Attendance
          </Btn>
        </>
      ) : (
        <>
          <Btn variant="ghost" onClick={closeModal}>
            Keep it
          </Btn>
          <Btn
            onClick={() => {
              closeModal()
              toast(cancelLeave(me, l.id) ?? 'Cancelled — balance restored')
            }}
          >
            Cancel the leave
          </Btn>
        </>
      ),
    })
  }

  const apply = () =>
    openModal({
      title: 'Apply for leave',
      body: (
        <LeaveForm
          personId={me.id}
          onSent={(msg) => {
            closeModal()
            toast(msg)
          }}
          onCancel={closeModal}
        />
      ),
    })

  const subSwitch = can('people') ? (
    <Seg
      options={[
        ['Requests', 'Requests'],
        ['Policy', 'Policy'],
      ]}
      value={sub}
      onChange={setSub}
    />
  ) : null

  if (sub === 'Policy') {
    return (
      <>
        <PageHead
          title="Leave"
          sub={`The rules every request is judged against · ${types.length} types`}
          actions={subSwitch}
        />
        <LeavePolicy />
      </>
    )
  }

  const risky = requests.filter((l) => l.st === 'pending' && l.clash)
  const approvedSoon = requests.filter((l) => l.st === 'approved' && l.from > now())
    .map((l) => ({ l, c: leaveCheck(l.who, l.type, l.days, l.from, l.to).cover }))
    .filter((x) => x.c && x.c.left < policy.minCover)

  const filters: [string, string][] = [
    ['pending', 'Waiting'],
    ['approved', 'Approved'],
    ['rejected', 'Declined'],
    ['all', 'All'],
  ]

  return (
    <>
      <PageHead
        title="Leave"
        sub={
          mine
            ? manager
              ? `Your requests and balances · approved by ${manager.n}`
              : 'Your requests and balances'
            : `${waitingOnMe.length} waiting on you · ${pendingAll.length} across the company`
        }
        actions={
          <>
            {subSwitch}
            <Btn onClick={apply}>Apply for leave</Btn>
          </>
        }
      />

      <Kpis>
        {types.filter((t) => t.annual > 0 || t.k === 'co').map((t) => {
          const b = balance[t.k]
          if (!b) return null
          return (
            <Kpi
              key={t.k}
              title={t.n}
              value={<span className={b.left ? '' : 'warn'}>{b.left}</span>}
              detail={`${b.taken} taken${b.pending ? ` · ${b.pending} pending` : ''}${t.annual ? ` of ${b.earned} earned` : ''}`}
            />
          )
        })}
      </Kpis>
      <Note top={10}>
        Balances are earned minus taken, computed from the requests below — not a number anyone typed
        in. {mine ? '' : 'Shown for you; open a person to see theirs.'}
      </Note>

      <LeaveAlerts
        mine={mine}
        risky={risky}
        approvedSoon={approvedSoon}
        waitingOnMe={waitingOnMe}
        reportsToMe={reportsToMe}
        onPolicy={() => setSub('Policy')}
      />

      <div className="fbar" style={{ marginTop: 16 }}>
        {filters.map(([key, label]) => (
          <Pill
            key={key}
            on={filter === key}
            count={key === 'all' ? scope.length : scope.filter((l) => l.st === key).length}
            onClick={() => setFilter(key)}
          >
            {label}
          </Pill>
        ))}
      </div>

      {rows.length ? (
        <>
          <FlexTable
            cols={COLS}
            min={900}
            head={[
              mine ? 'Type' : 'Who',
              mine ? 'Dates' : 'Type',
              mine ? 'Reason' : 'Dates',
              'Days',
              mine ? 'Status' : 'Reason',
              'Decision',
            ]}
          >
            {rows.slice(0, PAGE).map((l) => (
              <LeaveRow
                key={l.id}
                l={l}
                mine={mine}
                staff={staff}
                meId={me.id}
                canAssign={can('assign')}
                onDecide={decide}
                onCancel={cancel}
              />
            ))}
          </FlexTable>
          {rows.length > PAGE ? (
            <Note top={10}>
              Showing the {PAGE} most recent of {rows.length}.
            </Note>
          ) : null}
        </>
      ) : (
        <Card padded>
          <Note margin={0}>
            Nothing {filter === 'all' ? 'at all' : 'in this state'}.
          </Note>
        </Card>
      )}

      <LeaveTypesCard />
    </>
  )
}

export default LeaveScreen
