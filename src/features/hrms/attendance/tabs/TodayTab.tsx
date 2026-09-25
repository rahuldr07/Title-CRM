import { useStageName } from '@/domain/company/naming'
import { whoName } from '@/domain/people/roster'
import { Btn, Press } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Kpi, Kpis } from '@/shared/ui/Kpi'
import { Rows } from '@/shared/ui/DetailList'
import { SectionHead } from '@/shared/ui/PageHead'
import { useUi } from '@/shared/ui/UiProvider'
import { useTimeclock } from '@/domain/attendance/TimeclockProvider'
import { shiftHours, shiftOf } from '@/domain/attendance/workingDay'
import { decidesOwn } from '@/domain/auth/permissions'
import { useSession } from '@/domain/auth/SessionProvider'
import { fmtDate, fmtUsDate, initials, pad, usDate } from '@/shared/lib/format'
import type { Person } from '@/data/types'
import { Inline, Note } from '@/shared/ui/Layout'

export function TodayTab({
  list,
  today,
  inNow,
  awayToday,
  stateOf,
  openPerson,
}: {
  list: Person[]
  today: Date
  inNow: number
  awayToday: number
  stateOf: (p: Person) => [string, 'v' | 'b' | 'r' | 'n']
  openPerson: (id: string) => void
}) {
  const { toast } = useUi()
  const stageName = useStageName()
  const clock = useTimeclock()

  const groups = new Map<string, Person[]>()
  list.forEach((p) => {
    const d = p.dep[0] ?? '—'
    groups.set(d, [...(groups.get(d) ?? []), p])
  })

  const pendingCorrections = clock.corrections.filter((r) => r.st === 'pending')
  const pendingOt = clock.overtime.filter((o) => o.st === 'pending')
  const pendingSwaps = clock.swaps.filter((s) => s.st === 'pending')

  const punchesToday = clock.punches.filter((l) => l.d === usDate(today)).length

  const decide =
    (fn: (id: string, st: 'approved' | 'rejected') => string | null, id: string, what: string) =>
    (st: 'approved' | 'rejected') =>
      toast(fn(id, st) ?? `${what} ${st}`)

  return (
    <>
      <Kpis>
        <Kpi title="Working now" value={<span className="ok">{inNow}</span>} detail={`of ${list.length} on the team`} />
        <Kpi title="On leave today" value={awayToday} detail="approved and away" />
        <Kpi
          title="Waiting on you"
          value={<span className={clock.waiting ? 'bad' : 'ok'}>{clock.waiting}</span>}
          tone={clock.waiting ? 'alert' : undefined}
          detail={`${pendingCorrections.length} correction${pendingCorrections.length === 1 ? '' : 's'} · ${pendingOt.length} overtime · ${pendingSwaps.length} swap${pendingSwaps.length === 1 ? '' : 's'}`}
        />
        <Kpi title="Punches today" value={punchesToday} detail="in, out and breaks" />
      </Kpis>

      <SectionHead>Today — who is in</SectionHead>
      <Card padded>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          {[...groups].map(([dept, people]) => {
            const din = people.filter((p) => stateOf(p)[1] === 'v').length
            const off = people.filter((p) => stateOf(p)[0] === 'On leave').length
            return (
              <div key={dept} style={{ minWidth: 0 }}>
                <Inline justify="space-between" style={{ marginBottom: 9 }}>
                  <b style={{ fontSize: 'var(--t-body)' }}>{stageName(dept)}</b>
                  <span
                    className={`mono ${din === 0 ? 'bad' : off ? 'warn' : 'gr'}`}
                    style={{ fontSize: 'var(--t-label)' }}
                  >
                    {din}/{people.length} in
                  </span>
                </Inline>
                <Inline align={false} gap={6} style={{ flexDirection: 'column' }}>
                  {people.map((p) => {
                    const [label] = stateOf(p)
                    const sh = shiftOf(p)
                    return (
                      <Press
                        key={p.id}
                        onClick={() => openPerson(p.id)}
                        label={`${p.n}, ${label}`}
                        title={`${sh.n} · ${shiftHours(sh)}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          textAlign: 'left',
                          background: 'var(--tint)',
                          border: '1px solid var(--hair)',
                          borderRadius: 9,
                          padding: '7px 9px',
                          width: '100%',
                        }}
                      >
                        <span className="ava" style={{ width: 22, height: 22, fontSize: 'var(--t-mini)' }}>
                          {initials(p.n)}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: 'var(--t-small)',
                              fontWeight: 600,
                              display: 'block',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {p.n}
                          </span>
                          <span className="gr" style={{ fontSize: 'var(--t-label)' }}>
                            {label}
                          </span>
                        </span>
                      </Press>
                    )
                  })}
                </Inline>
                {din === 0 ? (
                  <div className="bad" style={{ fontSize: 'var(--t-label)', marginTop: 7 }}>
                    Nobody in yet
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
        <Note top={12}>
          Live, and grouped by department because that is the unit that has to be covered. A
          department showing 0 in is the one worth acting on before the queue backs up.
        </Note>
      </Card>

      {pendingCorrections.length ? (
        <>
          <SectionHead>Corrections waiting on you — {pendingCorrections.length}</SectionHead>
          <Card>
            <Rows bare>
              {pendingCorrections.map((r) => (
                <div className="rw" key={r.id}>
                  <span className="warn" style={{ fontSize: 'var(--t-lead)' }}>
                    ◷
                  </span>
                  <span>
                    <b>
                      {whoName(r.who)} — {fmtDate(r.d)}
                    </b>
                    <div className="sd">
                      System recorded: <i>{r.was}</i>. They say: <i>{r.ask}</i>.
                    </div>
                    <div className="sd gr">
                      Approving this records their account of the day beside the punches. It does not
                      change the month’s attendance totals, which are what the payslip is built from.
                    </div>
                  </span>
                  <Decide parties={[r.who]} onDecide={decide(clock.decideCorrection, r.id, `${whoName(r.who)} — correction`)} />
                </div>
              ))}
            </Rows>
          </Card>
        </>
      ) : null}

      {pendingOt.length ? (
        <>
          <SectionHead>Overtime to approve — {pendingOt.length}</SectionHead>
          <Card>
            <Rows bare>
              {pendingOt.map((o) => (
                <div className="rw" key={o.id}>
                  <span className="warn" style={{ fontSize: 'var(--t-lead)' }}>
                    ◷
                  </span>
                  <span>
                    <b>
                      {whoName(o.who)} — {Math.floor(o.mins / 60)}h {pad(o.mins % 60)}m on {fmtUsDate(o.d)}
                    </b>
                    <div className="sd">{o.why}</div>
                    <div className="sd gr">
                      Approving this adds the hours to their next payslip at the ordinary rate.
                    </div>
                  </span>
                  <Decide parties={[o.who]} onDecide={decide(clock.decideOvertime, o.id, 'Overtime')} />
                </div>
              ))}
            </Rows>
          </Card>
        </>
      ) : null}

      {pendingSwaps.length ? (
        <>
          <SectionHead>Shift swaps — {pendingSwaps.length}</SectionHead>
          <Card>
            <Rows bare>
              {pendingSwaps.map((x) => (
                <div className="rw" key={x.id}>
                  <span className="warn" style={{ fontSize: 'var(--t-lead)' }}>
                    ⇄
                  </span>
                  <span>
                    <b>
                      {whoName(x.from)} wants {whoName(x.to)} to take {fmtUsDate(x.d)}
                    </b>
                    <div className="sd">{x.why}</div>
                    <div className="sd gr">
                      {whoName(x.to)} has agreed. It needs you because it changes who is covering that
                      day.
                    </div>
                  </span>
                  <Decide parties={[x.from, x.to]} onDecide={decide(clock.decideSwap, x.id, 'Swap')} />
                </div>
              ))}
            </Rows>
          </Card>
        </>
      ) : null}

      {clock.waiting ? null : (
        <Note top={14}>
          Nothing is waiting on you. Corrections, overtime claims and shift swaps all arrive here when
          they are raised.
        </Note>
      )}
    </>
  )
}

function Decide({ parties, onDecide }: { parties: string[]; onDecide: (st: 'approved' | 'rejected') => void }) {
  const { me } = useSession()
  if (decidesOwn(parties, me.id)) {
    return <span style={{ fontSize: 'var(--t-label)' }}>Yours — someone else decides</span>
  }
  return (
    <span style={{ display: 'flex', gap: 6 }}>
      <Btn variant="ghost" small onClick={() => onDecide('rejected')}>
        Decline
      </Btn>
      <Btn small onClick={() => onDecide('approved')}>
        Approve
      </Btn>
    </span>
  )
}
