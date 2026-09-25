import { useStageName } from '@/domain/company/naming'
import { useGo } from '@/shared/hooks/useGo'
import { useSession } from '@/domain/auth/SessionProvider'
import { routeNeeds } from '@/domain/auth/permissions'
import { BarRow } from '@/shared/ui/Bar'
import { Btn } from '@/shared/ui/Button'
import { Card, Label } from '@/shared/ui/Card'
import { MatrixTable, Th } from '@/shared/ui/MatrixTable'
import { Chip } from '@/shared/ui/Chip'
import { AVAIL } from '@/data/people'
import { availOn } from '@/domain/leave/leave'
import { now } from '@/shared/lib/clock'
import { fmtHour, labelOf, TZ } from '@/shared/lib/format'
import type { Person } from '@/data/types'
import { CAPACITY_AMBER, CAPACITY_RED, capacityTone } from '@/domain/orders/metrics'
import type { AssignmentBoard } from '@/domain/assignment/engine'
import { loadOf, useDayLoads } from '@/domain/orders/dayLoad'
import { Inline, Note } from '@/shared/ui/Layout'

export function CapacityTab({ board }: { board: AssignmentBoard }) {
  const navigate = useGo()
  const { can } = useSession()
  const stageName = useStageName()
  const companyNeeds = routeNeeds('company')
  const mayEditStaff = !companyNeeds || can(companyNeeds)
  const { run } = board
  const loads = useDayLoads(run.ctx.staff)
  const plan = run.assigns.filter((a) => a.today)

  const today = now()
  const availOf = (s: Person) => availOn(s, today)
  const rostered = run.ctx.staff.filter((s) => s.dep.length)
  const available = rostered.filter((s) => availOf(s) === 'ok')
  const totalCap = available.reduce((a, s) => a + s.cap, 0)

  const atTarget = available.filter((s) => loadOf(loads, s.id) >= s.cap)
  const stagesAffected = [...new Set(atTarget.flatMap((s) => s.dep))]

  return (
    <>
      {atTarget.length ? (
        <div className="bnr r">
          <span className="bi">◷</span>
          <div>
            <div className="bt">
              {atTarget.length} {atTarget.length === 1 ? 'person is' : 'people are'} at their target
              with orders still arriving
            </div>
            {atTarget.map((s) => s.n).join(', ')}. Anything else needing{' '}
            {stagesAffected.map(stageName).join(' or ')} today becomes an exception.
            <div className="bs">
              Raising a target or bringing someone in clears it prospectively — it does not re-place
              what already failed.
            </div>
          </div>
        </div>
      ) : null}

      <Card padded>
        <Label>Load through the day, by hour {TZ}</Label>
        <Inline gap={5} align="flex-end" style={{ height: 150, marginTop: 6 }}>
          {run.hourly.map((h) => {
            const used = Object.values(h.load).reduce((a, b) => a + b, 0)
            const pct = totalCap ? Math.round((used / totalCap) * 100) : 0
            return (
              <div
                key={h.hr}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  height: '100%',
                  gap: 4,
                }}
                title={`${fmtHour(h.hr)} — ${pct}% of total capacity used`}
              >
                <span className="mono gr" style={{ fontSize: 'var(--t-eyebrow)', textAlign: 'center' }}>
                  {pct}%
                </span>
                <span
                  style={{
                    background: capacityTone(pct).fill,
                    borderRadius: '5px 5px 0 0',
                    height: `${Math.min(100, pct)}%`,
                  }}
                />
                <span className="mono gr" style={{ fontSize: 'var(--t-mini)', textAlign: 'center' }}>
                  {h.hr}
                </span>
              </div>
            )
          })}
        </Inline>
        <Note top={12}>
          Total capacity consumed as the day fills. Green under {CAPACITY_AMBER}%, amber to{' '}
          {CAPACITY_RED}%, red above —
          the point at which the next arrival is likely to become an exception.
        </Note>
      </Card>

      <Card padded top={18}>
        <Label>Per person — target against today’s load</Label>
        {rostered.map((s) => {
          const added = plan.filter((p) => p.who === s.id).length
          const total = loadOf(loads, s.id)
          const before = total - added
          const at = total >= s.cap
          const carried = total ? Math.round((before / total) * 100) : 0
          return (
            <BarRow
              key={s.id}
              cols="150px 1fr 120px"
              padding="7px 0"
              labelClass=""
              label={
                <>
                  {s.n}
                  {availOf(s) !== 'ok' ? (
                    <>
                      {' '}
                      <span
                        className={`chip ${labelOf(AVAIL, availOf(s))[1]}`}
                        style={{ fontSize: 'var(--t-eyebrow)', padding: '1px 7px' }}
                      >
                        {labelOf(AVAIL, availOf(s))[0]}
                      </span>
                    </>
                  ) : null}
                </>
              }
              value={total}
              max={s.cap}
              color={
                at
                  ? 'var(--bad)'
                  : added
                    ? `linear-gradient(90deg, var(--brand2) ${carried}%, var(--ok) ${carried}%)`
                    : 'var(--brand2)'
              }
              title={`${before} already open, ${added} added, target ${s.cap}`}
              rightClass={`mono ${at ? 'bad' : 'gr'}`}
              rightStyle={{ fontSize: 'var(--t-label)' }}
              right={
                <>
                  {total} / {s.cap}
                  {added ? <span className="ok"> +{added}</span> : null}
                </>
              }
            />
          )
        })}
        <Note size="label" top={10}>
          Purple is what they already had, green is what this batch added. Red means at target.
        </Note>
      </Card>

      <Card top={18}>
        <div className="ch">
          <h2>Availability today</h2>
          {mayEditStaff ? (
            <div className="r">
              <Btn
                variant="ghost"
                small
                onClick={() => navigate({ to: '/company', search: { tab: 'Staff' } })}
              >
                Edit staff
              </Btn>
            </div>
          ) : null}
        </div>
        <div className="tsc">
          <MatrixTable label="Availability today">
            <thead>
              <tr>
                <Th style={{ textAlign: 'left' }}>Staff</Th>
                <Th style={{ textAlign: 'left' }}>Departments</Th>
                <Th num>Target</Th>
                <Th num>Load</Th>
                <Th num>Room</Th>
                <Th style={{ textAlign: 'left' }}>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rostered.map((s) => {
                const total = loadOf(loads, s.id)
                return (
                  <tr key={s.id}>
                    <td>
                      <b>{s.n}</b>
                    </td>
                    <td className="gr">{s.dep.map(stageName).join(', ')}</td>
                    <td className="n">{s.cap}</td>
                    <td className="n">{total}</td>
                    <td className={`n ${total >= s.cap ? 'bad' : ''}`}>
                      {Math.max(0, s.cap - total)}
                    </td>
                    <td>
                      <Chip kind={labelOf(AVAIL, availOf(s))[1]}>{labelOf(AVAIL, availOf(s))[0]}</Chip>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </MatrixTable>
        </div>
      </Card>
    </>
  )
}
