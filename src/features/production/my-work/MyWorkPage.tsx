import { useStageName } from '@/domain/company/naming'
import { useGo } from '@/shared/hooks/useGo'
import { Banner } from '@/shared/ui/Banner'
import { Bar, BarGrid } from '@/shared/ui/Bar'
import { Btn, Press } from '@/shared/ui/Button'
import { Card, Label } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { DetailRow } from '@/shared/ui/DetailList'
import { Kpi, Kpis } from '@/shared/ui/Kpi'
import { PageHead } from '@/shared/ui/PageHead'
import { focusSection } from '@/shared/ui/focus'
import { TeamWishes, YourWish } from '@/shared/ui/Wishes'
import { ScoreRing } from './ScoreRing'
import { useSession } from '@/domain/auth/SessionProvider'
import { useUi } from '@/shared/ui/UiProvider'
import { useTimeclock } from '@/domain/attendance/TimeclockProvider'
import { UpdateForm } from '@/features/production/my-work/forms/UpdateForm'
import { SwapForm } from '@/features/production/my-work/forms/SwapForm'
import { OvertimeForm } from '@/features/production/my-work/forms/OvertimeForm'
import { NeedsYou } from './NeedsYou'
import { TodayCard } from './TodayCard'
import { DaySizingDetail, FinishedTodayDetail, PastCheckpointDetail } from './MyWorkDetails'
import { YourUpdatesCard } from './YourUpdatesCard'
import { MyQueue } from './MyQueue'
import { FinishedToday } from './FinishedToday'
import { YourQualityCard } from './YourQualityCard'
import { WhereYouFitCard } from './WhereYouFitCard'
import { greeting, nextHolidayFrom } from './myDay'
import { fromYourDepartment, postUpdate, useUpdates } from './updates'
import { unreadTotal, useChats } from './chats'
import { HOLIDAYS } from '@/data/people'
import { ATT } from '@/data/hrms'
import { useLeaveTypes } from '@/domain/leave/leaveStore'
import { LATEST_PAY_MONTH } from '@/domain/payroll/payruns'
import { useLiveWork } from '@/domain/orders/liveWork'
import { useDayLoad } from '@/domain/orders/dayLoad'
import { orderPlan } from '@/domain/assignment/sla'
import { useLeaveBalance } from '@/domain/leave/balance'
import { useQcRules } from '@/domain/quality/qcRules'
import { DEFAULT_RANGE, inRange, resolveRange } from '@/shared/lib/range'
import { useQcLog } from '@/shared/hooks/useQcLog'
import { clockNow, restCheck, shiftOf, worked } from '@/domain/attendance/workingDay'
import { qcAverage, scoreBand } from '@/domain/quality/quality'
import { celebrationsWithin } from '@/domain/people/celebrations'
import { now } from '@/shared/lib/clock'
import { useStaff } from '@/domain/people/roster'
import { fmtDate } from '@/shared/lib/format'
import { Note } from '@/shared/ui/Layout'

export default function MyWork() {
  const staff = useStaff()
  const { me } = useSession()
  const stageName = useStageName()
  const { openModal, closeModal, toast } = useUi()
  const clock = useTimeclock()
  const navigate = useGo()
  const qcLog = useQcLog()
  const updates = useUpdates()
  const { dwork } = useLiveWork()
  const wk = useDayLoad(me)
  const mine = [...wk.items].sort((a, b) => a.hr - b.hr)
  const open = mine.filter((i) => !i.fin)
  const finished = mine.filter((i) => i.fin)
  const risky = open.map((i) => ({ i, p: orderPlan(i.o) })).filter((x) => x.p.doomed || x.p.behind)

  const range = resolveRange(DEFAULT_RANGE)
  const rated = (qcLog.data ?? []).filter((x) => x.onName === me.n && inRange(x.d, range))
  const showScores = useQcRules().find((r) => r.k === 'see')?.on ?? false
  const qavg = qcAverage(rated)
  const band = showScores && qavg !== null ? scoreBand(qavg) : null

  const shift = shiftOf(me)
  const mark = clock.markOf(me.id)
  const rest = restCheck(mark, clockNow())

  const month = LATEST_PAY_MONTH
  const att = ATT[month]?.[me.id] ?? { present: 0, working: 0, paidLeave: 0, lop: 0, hol: 0 }
  const balances = useLeaveBalance(me.id)
  const leaveTypes = useLeaveTypes()
  const nextHoliday = nextHolidayFrom(HOLIDAYS, now())

  const wishes = celebrationsWithin(staff, now(), 7)
  const yours = wishes.filter((c) => c.person.id === me.id && c.inDays === 0)
  const theirs = wishes.filter((c) => c.person.id !== me.id)

  const myUpdates = updates.filter((u) => u.who === me.id).slice(0, 4)
  const deptUpdates = fromYourDepartment(updates, me)
  const unread = unreadTotal(useChats(), me.id)

  const workedToday = mark?.out ? worked(mark) - (mark.breakMins ?? 0) : 0

  const askSwap = () => {
    const peers = staff.filter(
      (x) => x.id !== me.id && x.active !== false && x.dep.some((d) => me.dep.includes(d)),
    )
    if (!peers.length) return toast('Nobody else is in your department to swap with')
    openModal({
      title: 'Ask someone to take a shift',
      body: (
        <SwapForm
          peers={peers}
          onCancel={closeModal}
          onSubmit={(to, date, why) => {
            closeModal()
            toast(clock.requestSwap(me.id, to, date, why) ?? 'Sent to your manager')
          }}
        />
      ),
    })
  }

  const raiseOvertime = () =>
    openModal({
      title: 'Claim overtime',
      body: (
        <OvertimeForm
          workedMins={workedToday}
          onCancel={closeModal}
          onSubmit={(date, minutes, why) => {
            closeModal()
            toast(clock.claimOvertime(me.id, date, minutes, why) ?? 'Sent for approval')
          }}
        />
      ),
    })

  const addUpdate = () =>
    openModal({
      title: 'Add an update',
      body: (
        <UpdateForm
          onCancel={closeModal}
          onSubmit={(kind, body) => {
            postUpdate(me.id, kind, body)
            closeModal()
            toast('Posted')
          }}
        />
      ),
    })

  const openNeedsYou = () => openModal({ title: 'Needs you', body: <NeedsYou me={me} /> })

  const myDone = () =>
    openModal({
      title: `Finished today — ${finished.length}`,
      body: <FinishedTodayDetail finished={finished} pct={wk.pct} />,
    })

  const myLate = () =>
    openModal({
      title: `Past a checkpoint — ${risky.length}`,
      body: <PastCheckpointDetail risky={risky} />,
      footer: (
        <>
          <Btn
            variant="ghost"
            onClick={() => {
              closeModal()
              focusSection('mwQueue')
            }}
          >
            Your queue
          </Btn>
          <Btn onClick={closeModal}>Close</Btn>
        </>
      ),
    })

  const myCapacity = () =>
    openModal({
      title: 'How your day is sized',
      body: <DaySizingDetail me={me} day={wk} />,
    })

  const clockActions = !mark ? (
    <Btn onClick={() => clock.checkIn(me.id, toast)}>Check in</Btn>
  ) : !mark.out ? (
    <>
      {mark.breakIn && !mark.breakOut ? (
        <Btn onClick={() => toast(clock.breakEnd(me.id))}>End break</Btn>
      ) : (
        <Btn variant="ghost" onClick={() => toast(clock.breakStart(me.id))}>
          Start break
        </Btn>
      )}
      <Btn onClick={() => clock.checkOut(me.id, toast)}>Check out</Btn>
    </>
  ) : (
    <>
      <Chip kind="v">Day complete</Chip>
      <Btn variant="ghost" onClick={raiseOvertime}>
        Claim overtime
      </Btn>
    </>
  )

  return (
    <>
      <PageHead
        title={`Good ${greeting(now().getHours())}, ${me.n.split(' ')[0]}`}
        sub={`${me.dep.map(stageName).join(' · ') || 'No department'} · target ${me.cap} a day`}
        actions={
          <>
            <Press
              className="needsYou"
              label={`Needs you${deptUpdates.length + unread ? `, ${deptUpdates.length + unread} new` : ''}`}
              onClick={openNeedsYou}
            >
              <span>Needs you</span>
              {deptUpdates.length + unread ? (
                <span className="bdg">{deptUpdates.length + unread}</span>
              ) : null}
              <span className="sw" aria-hidden="true">
                <i />
              </span>
            </Press>
            <Btn onClick={() => navigate({ to: '/staff/$personId', params: { personId: me.id } })}>
              My profile
            </Btn>
          </>
        }
      />

      <div className="mw">
        <YourWish celebrations={yours} firstName={me.n.split(' ')[0] ?? me.n} />

        <TodayCard
          shift={shift}
          mark={mark}
          rest={rest}
          actions={
            <>
              {clockActions}
              <Btn variant="ghost" onClick={askSwap}>
                Swap a shift
              </Btn>
              <Btn variant="ghost" onClick={() => navigate({ to: '/leave' })}>
                Leave
              </Btn>
            </>
          }
        />

        <Kpis>
          <Kpi
            title="On your desk"
            value={<span className={open.length ? 'warn' : 'ok'}>{open.length}</span>}
            tone={open.length ? 'warn' : undefined}
            detail={open.length ? 'still to finish' : 'nothing outstanding'}
            chevron
            hint="Your queue"
            onClick={() => focusSection('mwQueue')}
          />
          <Kpi
            title="Finished today"
            value={<span className="ok">{wk.done}</span>}
            detail={`${wk.pct}% of what you were given`}
            chevron
            hint="What you finished"
            onClick={myDone}
          />
          <Kpi
            title="Running late"
            value={<span className={risky.length ? 'bad' : 'ok'}>{risky.length}</span>}
            tone={risky.length ? 'alert' : undefined}
            detail="past an internal checkpoint"
            chevron
            hint="Which ones, and by how much"
            onClick={myLate}
          />
          <Kpi
            title="Room left today"
            value={wk.room}
            detail={`of a ${me.cap} target`}
            chevron
            hint="How the target is set"
            onClick={myCapacity}
          />
        </Kpis>

        <div className="two" style={{ marginTop: 16, gridAutoFlow: 'row dense' }}>
          <Card padded>
            <Label>Your {month}</Label>
            {(
              [
                ['Days present', `${att.present} of ${att.working}`],
                ['Paid leave taken', att.paidLeave],
                ['Unpaid days', att.lop],
                ['Holidays in the month', att.hol],
              ] as [string, string | number][]
            ).map((r) => (
              <DetailRow key={r[0]} label={r[0]} value={<b className="mono">{r[1]}</b>} />
            ))}
            {nextHoliday ? (
              <Note top={12}>
                Next holiday: <b>{nextHoliday.h.n}</b> on {fmtDate(nextHoliday.dt)}
                {nextHoliday.h.opt ? ' — optional' : ''}.
              </Note>
            ) : null}
          </Card>

          <Card padded>
            <Label>Leave you have left</Label>
            {leaveTypes.filter((t) => t.annual > 0).map((t) => {
              const b = balances[t.k]
              if (!b) return null
              return (
                <BarGrid key={t.k} cols="130px 1fr 78px" gap={11} padding="6px 0" fontSize="var(--t-body)">
                  <span>
                    <Chip kind={t.c}>{t.n}</Chip>
                  </span>
                  <Bar value={b.left} max={Math.max(1, b.earned)} color="var(--brand2)" />
                  <span className="mono" style={{ textAlign: 'right' }}>
                    {b.left} of {b.earned}
                  </span>
                </BarGrid>
              )
            })}
            <div style={{ marginTop: 12 }}>
              <Btn variant="ghost" small onClick={() => navigate({ to: '/leave' })}>
                Apply for leave
              </Btn>
            </div>
          </Card>

          <Card
            padded
            style={{
              gridColumn: '-2 / -1',
              alignSelf: 'stretch',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <ScoreRing
              band={band}
              label={band ? `Quality score ${band.pct}%, ${band.label}` : 'No quality score to show'}
            />
          </Card>

          {theirs.length ? (
            <TeamWishes celebrations={theirs} title="Around the team" style={{ alignSelf: 'stretch' }} />
          ) : null}
        </div>

        {risky.length ? (
          <Banner
            kind="d"
            icon="⚑"
            top={16}
            title={`${risky.length} of yours ${risky.length === 1 ? 'is' : 'are'} behind where they should be`}
          >
            These are at the top of the list.{' '}
            {risky.some((x) => x.p.doomed)
              ? 'One or more cannot be finished in time — tell whoever runs your department now, not at five o’clock.'
              : 'Still recoverable, but the slack is going.'}
          </Banner>
        ) : null}

        <YourUpdatesCard updates={myUpdates} onAdd={addUpdate} />

        <MyQueue open={open} done={wk.done} />

        {wk.done ? <FinishedToday finished={finished} done={wk.done} /> : null}

        <div className="two" style={{ marginTop: 18 }}>
          <YourQualityCard
            showScores={showScores}
            pending={qcLog.isPending}
            rated={rated}
            qavg={qavg}
            rangeLabel={range.label}
            onAll={() => navigate({ to: '/staff/$personId', params: { personId: me.id } })}
          />
          <WhereYouFitCard deps={me.dep} deptTotals={dwork} stages={wk.stages} />
        </div>
      </div>
    </>
  )
}
