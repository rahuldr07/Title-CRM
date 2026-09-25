import { useSearch } from '@tanstack/react-router'
import { useGo } from '@/shared/hooks/useGo'
import { Btn, Press } from '@/shared/ui/Button'
import { Card, Label } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { Avatar } from '@/shared/ui/Avatar'
import { PageHead } from '@/shared/ui/PageHead'
import { Rows } from '@/shared/ui/DetailList'
import { Note } from '@/shared/ui/Layout'
import { useSession } from '@/domain/auth/SessionProvider'
import { useUi } from '@/shared/ui/UiProvider'
import { useLeave, useLeaveTypes } from '@/domain/leave/leaveStore'
import { useStaff, whoName } from '@/domain/people/roster'
import { HOLIDAYS } from '@/data/people'
import { fmtDate, iso, midnight, monthLabel, parseIso, usDate } from '@/shared/lib/format'
import { now } from '@/shared/lib/clock'
import { LeaveForm } from './forms/LeaveForm'
import type { ChipKind, Leave, LeaveType, Person } from '@/data/types'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DOTS_SHOWN = 5
const UPCOMING_SHOWN = 6

const TINT: Record<ChipKind, string> = {
  v: 'var(--ok)',
  b: 'var(--brand)',
  r: 'var(--warn)',
  d: 'var(--bad)',
  n: 'var(--ink)',
}

const shortName = (n: string) => {
  const [first, ...rest] = n.split(' ')
  const last = rest[rest.length - 1]
  return last ? `${first} ${last[0]}` : first
}

const sameDay = (a: Date, b: Date) => midnight(a).getTime() === midnight(b).getTime()
const covers = (l: Leave, d: Date) =>
  midnight(l.from).getTime() <= midnight(d).getTime() && midnight(l.to).getTime() >= midnight(d).getTime()

const stepMonth = (d: Date, n: number) => {
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), days))
}

function monthGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay())
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const cells = Math.ceil((last.getDate() + first.getDay()) / 7) * 7
  return Array.from(
    { length: cells },
    (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
  )
}

export default function LeaveCalendarPage() {
  const { me, can } = useSession()
  const { openModal, closeModal, toast } = useUi()
  const navigate = useGo()
  const { d } = useSearch({ from: '/leave/calendar' })
  const staff = useStaff()
  const requests = useLeave()
  const types = useLeaveTypes()

  const typeOf = (k: string): LeaveType | undefined => types.find((t) => t.k === k)
  const colourOf = (k: string) => TINT[typeOf(k)?.c ?? 'n']

  const today = midnight(now())
  const picked = d ? midnight(parseIso(d)) : today
  const selected = Number.isNaN(picked.getTime()) ? today : picked
  const month = new Date(selected.getFullYear(), selected.getMonth(), 1)

  const team: Person[] = can('all')
    ? staff.filter((p) => p.active !== false)
    : staff.filter(
        (p) => p.active !== false && (p.id === me.id || p.dep.some((x) => me.dep.includes(x))),
      )
  const ids = new Set(team.map((p) => p.id))
  const taken = requests.filter((l) => l.st === 'approved' && ids.has(l.who))

  const onDay = (date: Date) => taken.filter((l) => covers(l, date))
  const holidayOn = (date: Date) => HOLIDAYS.find((h) => h.d === usDate(date))

  const select = (date: Date) =>
    navigate({ to: '/leave/calendar', search: { d: iso(date) }, replace: true })

  const selectedLeave = onDay(selected)
  const mineThatDay = selectedLeave.some((l) => l.who === me.id)
  const holiday = holidayOn(selected)

  const upcoming = taken
    .filter((l) => midnight(l.from).getTime() > today.getTime())
    .sort((a, b) => +a.from - +b.from)
    .slice(0, UPCOMING_SHOWN)

  const apply = (start?: Date) =>
    openModal({
      title: 'Apply for leave',
      body: (
        <LeaveForm
          personId={me.id}
          {...(start ? { startOn: iso(start) } : {})}
          onSent={(message) => {
            closeModal()
            toast(message)
          }}
          onCancel={closeModal}
        />
      ),
    })

  const span = (l: Leave) =>
    sameDay(l.from, l.to) ? fmtDate(l.from) : `${fmtDate(l.from)} – ${fmtDate(l.to)}`

  const personRow = (l: Leave) => {
    const t = typeOf(l.type)
    const who = staff.find((p) => p.id === l.who)
    const name = whoName(l.who)
    return (
      <Press
        key={l.id}
        className="rw tagged"
        style={{ width: '100%', textAlign: 'left' }}
        label={`${name}, ${t?.n ?? l.type}, ${span(l)} — show ${fmtDate(l.from)}`}
        onClick={() => select(l.from)}
      >
        <span>
          <Avatar name={name} />
        </span>
        <span>
          <b style={{ fontSize: 'var(--t-body)' }}>
            {name}
            {l.who === me.id ? ' · you' : ''}
          </b>
          <div className="sd">
            {span(l)}
            {who?.dep.length ? ` · ${who.dep.join(', ')}` : ''}
          </div>
        </span>
        <span>
          <Chip kind={t?.c ?? 'n'}>{t?.n ?? l.type}</Chip>
        </span>
      </Press>
    )
  }

  return (
    <>
      <PageHead
        parent={{ to: '/leave', label: 'Leave' }}
        title="Leave calendar"
        sub={
          can('all')
            ? `Who is off, across the company · ${taken.length} approved`
            : `Who is off in ${me.dep.join(' · ') || 'your department'} · ${taken.length} approved`
        }
        actions={<Btn onClick={() => apply()}>Apply for leave</Btn>}
      />

      <div className="lcal">
        <Card padded>
          <div className="lcal-head">
            <div className="lcal-nav">
              <Btn variant="ghost" small aria-label="Previous month" onClick={() => select(stepMonth(selected, -1))}>
                ‹
              </Btn>
              <b style={{ fontSize: 'var(--t-lead)' }}>{monthLabel(month)}</b>
              <Btn variant="ghost" small aria-label="Next month" onClick={() => select(stepMonth(selected, 1))}>
                ›
              </Btn>
              {sameDay(month, new Date(today.getFullYear(), today.getMonth(), 1)) ? null : (
                <Btn variant="ghost" small onClick={() => select(today)}>
                  Today
                </Btn>
              )}
            </div>
            <div className="lcal-key">
              {types.map((t) => (
                <span key={t.k}>
                  <i style={{ background: TINT[t.c] }} />
                  {t.n}
                </span>
              ))}
            </div>
          </div>

          <div className="lcal-grid">
            {WEEKDAYS.map((w) => (
              <div key={w} className="lcal-wd">
                {w}
              </div>
            ))}
            {monthGrid(month).map((date) => {
              const off = onDay(date)
              const hol = holidayOn(date)
              const out = date.getMonth() !== month.getMonth()
              const weekend = date.getDay() === 0 || date.getDay() === 6
              const names = [...new Set(off.map((l) => shortName(whoName(l.who))))]
              const label =
                names.length === 1
                  ? names[0]
                  : names.length === 2
                    ? `${names[0]} +1`
                    : `${names.length} people`
              return (
                <Press
                  key={iso(date)}
                  className={`lcal-day${out ? ' out' : ''}${sameDay(date, selected) ? ' on' : ''}${weekend ? ' wk' : ''}`}
                  aria-pressed={sameDay(date, selected)}
                  label={`${fmtDate(date)} — ${off.length ? `${off.length} on leave` : 'nobody on leave'}${hol ? `, ${hol.n}` : ''}`}
                  onClick={() => select(date)}
                >
                  <span className="lcal-n">
                    {date.getDate()}
                    {sameDay(date, today) ? <i className="lcal-today" /> : null}
                  </span>
                  {hol ? (
                    <span className="lcal-hol" title={hol.n}>
                      {hol.n}
                    </span>
                  ) : null}
                  {off.length ? (
                    <>
                      <span className="lcal-dots">
                        {off.slice(0, DOTS_SHOWN).map((l) => (
                          <i key={l.id} style={{ background: colourOf(l.type) }} />
                        ))}
                      </span>
                      <span className="lcal-chip" style={{ color: colourOf(off[0]?.type ?? '') }}>
                        {label}
                      </span>
                    </>
                  ) : null}
                </Press>
              )
            })}
          </div>

          <Note top={12}>
            Approved leave only. A request still waiting on a decision is not leave yet, and showing
            it as though it were is how two people end up away on the same day.
          </Note>
        </Card>

        <div className="lcal-side">
          <Card padded>
            <Label>
              {WEEKDAY_FULL[selected.getDay()]} · {fmtDate(selected)}
            </Label>
            {holiday ? (
              <div className="rw lcal-holiday">
                <span>★</span>
                <span>
                  <b>{holiday.n}</b>
                  <div className="sd">{holiday.opt ? 'An optional holiday' : 'A company holiday'}</div>
                </span>
                <span />
              </div>
            ) : null}
            <p style={{ fontSize: 'var(--t-body)', margin: '0 0 10px' }}>
              {selectedLeave.length
                ? `${selectedLeave.length} ${selectedLeave.length === 1 ? 'person is' : 'people are'} on leave`
                : 'Nobody is on leave'}
            </p>
            {selectedLeave.length ? <Rows bare>{selectedLeave.map(personRow)}</Rows> : null}
            <div className="rw lcal-hint">
              <span className="brand">ⓘ</span>
              <span>
                <b>{mineThatDay ? 'You are already off that day' : 'Planning to apply for this date?'}</b>
                <div className="sd">
                  {mineThatDay
                    ? 'It is in the list above. Cancelling is on the Leave page.'
                    : selectedLeave.length
                      ? `${selectedLeave.length} ${selectedLeave.length === 1 ? 'colleague is' : 'colleagues are'} already away, which is what your manager weighs against cover.`
                      : 'Nobody from your department is away, so cover is not the thing in the way.'}
                </div>
              </span>
              <span />
            </div>
            {mineThatDay ? null : (
              <div style={{ marginTop: 12 }}>
                <Btn small onClick={() => apply(selected)}>
                  Apply for this date
                </Btn>
              </div>
            )}
          </Card>

          <Card padded>
            <div className="ch" style={{ border: 'none', padding: '0 0 10px' }}>
              <Label>Upcoming leave</Label>
              <div className="r">
                <Btn variant="ghost" small onClick={() => navigate({ to: '/leave' })}>
                  All requests →
                </Btn>
              </div>
            </div>
            {upcoming.length ? (
              <Rows bare>{upcoming.map(personRow)}</Rows>
            ) : (
              <Note>Nothing approved ahead of today.</Note>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
