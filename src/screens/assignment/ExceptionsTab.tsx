import { useState } from 'react'
import { useGo } from '@/lib/nav'
import { Btn, Card, Chip, Empty } from '@/components/ui'
import { useUi } from '@/state/ui'
import { useSession } from '@/state/session'
import { AVAIL, STAFF } from '@/data/people'
import { ASSIGN_STAGES } from '@/data/org'
import { COVSTAGES } from '@/lib/qualification'
import { routeNeeds, whoName } from '@/lib/permissions'
import { covOK } from '@/lib/ruleText'
import {
  EXCLUSION,
  wouldSelfReview,
  type AssignmentBoard,
  type Exception,
  type ExclusionReason,
} from '@/lib/engine'
import { openExceptions, orderAsEdited, orderById, setAssignee, useOrderState } from '@/state/orders'

const REMEDY: Record<ExclusionReason, string> = {
  capacity: 'Raising a target or adding someone to the department clears all of these.',
  self: 'The person free for the QC is the one who did the work, and nobody checks their own. Assign someone else from the department.',
  unavailable: 'Everyone in that department is on leave or off shift today.',
  coverage:
    'This is not a roster problem — the people are there, they are simply not qualified for that state, county or product. Widening somebody’s coverage clears the whole group.',
  'no-dept': 'Nobody is a member of that department at all.',
}

const SHOWN_PER_CAUSE = 5

const COLS = '40px 150px 120px 130px 1fr'

const key = (e: Exception) => `${e.o.id}|${e.stage}`

/* A group can hold several stages, so its description counts them rather than
   quoting the first row — which labelled a mixed group of seventeen "Typing". */
function stagesIn(list: Exception[]): string {
  const n = list.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.stage]: (acc[e.stage] ?? 0) + 1 }), {})
  return ASSIGN_STAGES.filter((st) => n[st])
    .map((st) => `${st} ×${n[st]}`)
    .join(', ')
}

export function ExceptionsTab({
  board,
  onTab,
}: {
  board: AssignmentBoard
  onTab: (t: 'Rules') => void
}) {
  const navigate = useGo()
  const { can, me } = useSession()
  const companyNeeds = routeNeeds('company')
  const mayOpenCompany = !companyNeeds || can(companyNeeds)
  const { toast, openModal, closeModal } = useUi()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  useOrderState()

  const { run } = board
  const exc = openExceptions()
  const orders = run.today
  const total = orders.length * ASSIGN_STAGES.length

  const byWhy = exc.reduce<Record<string, Exception[]>>((acc, e) => {
    ;(acc[e.why] = acc[e.why] ?? []).push(e)
    return acc
  }, {})

  const deptOut = run.deptOut

  const assign = (e: Exception, id: string) => {
    if (!id) return
    const order = orderById(e.o.id)
    const paired = wouldSelfReview(order ? orderAsEdited(order).a : (e.o.plan ?? {}), e.stage, id)
    if (paired) {
      openModal({
        title: 'That would be self-review',
        body: (
          <p style={{ fontSize: 'var(--t-body)' }}>
            <b>{whoName(id)}</b> did the {paired} on this order, and nobody checks their own work.
            Pick someone else from {e.stage}.
          </p>
        ),
        footer: <Btn onClick={closeModal}>Pick someone else</Btn>,
      })
      return
    }
    setAssignee(e.o.id, e.stage, id, me.n)
    const left = exc.length - 1
    toast(
      `${e.o.id} ${e.stage} → ${whoName(id)} · ${left ? `${left} still need a person` : 'every stage is placed'}`,
    )
  }

  return (
    <>
      <div className={`bnr ${exc.length ? 'r' : 'v'}`}>
        <span className="bi">{exc.length ? '⚑' : '✓'}</span>
        <div>
          <div className="bt">
            {exc.length} stage{exc.length === 1 ? '' : 's'} could not be placed
          </div>
          Out of {total} across {orders.length} orders. Everything else went out automatically as it
          arrived — these are the only ones waiting on a person.
          <div className="bs">
            Doc Req is not assigned here — it is an exception branch, given out only when an order
            enters it.
          </div>
        </div>
        <div className="ba">
          <Btn variant="ghost" onClick={() => onTab('Rules')}>
            Change the rules
          </Btn>
        </div>
      </div>

      {deptOut.length ? (
        <div className="bnr d">
          <span className="bi">⚠</span>
          <div>
            <div className="bt">{deptOut.join(' and ')} has nobody available today</div>
            {deptOut.map((d) => {
              const members = STAFF.filter((s) => s.dep.includes(d))
              const allOnLeave = members.every((s) => s.avail === 'leave')
              return (
                <span key={d}>
                  {d} is staffed by {members.map((s) => s.n).join(', ')} —{' '}
                  {members.length === 1 ? 'one person, and they are' : 'all of whom are'}{' '}
                  {allOnLeave ? 'on leave' : 'unavailable'}.{' '}
                </span>
              )
            })}
            Any order that needs it today has nowhere to go.
            <div className="bs">This is why a department with one member is worth watching.</div>
          </div>
          {/* A lead can run assignment but cannot open Company, where this led. */}
          {mayOpenCompany ? (
            <div className="ba">
              <Btn
                variant="ghost"
                small
                onClick={() => navigate({ to: '/company', search: { tab: 'Departments' } })}
              >
                See departments
              </Btn>
            </div>
          ) : null}
        </div>
      ) : null}

      <h2 className="sec">Grouped by why — fixing the cause clears the whole group</h2>

      {Object.entries(byWhy)
        .map(([why, list]) => {
          const [label, tone] = EXCLUSION[why as ExclusionReason]
          return (
            <Card key={why} style={{ marginBottom: 13 }}>
              <div className="ch">
                <h2>{label}</h2>
                <div className="r">
                  <Chip kind={tone === 'bad' ? 'd' : 'r'}>
                    {list.length} stage{list.length === 1 ? '' : 's'}
                  </Chip>
                </div>
              </div>
              <div className="cb" style={{ paddingBottom: 0 }}>
                <p className="gr" style={{ fontSize: 'var(--t-small)', marginBottom: 13 }}>
                  {stagesIn(list)}. {REMEDY[why as ExclusionReason]}
                </p>
              </div>
              <div className="tsc">
                <div style={{ minWidth: 700 }}>
                  <div className="trow h" style={{ gridTemplateColumns: COLS }}>
                    <span>#</span>
                    <span>Order</span>
                    <span>Stage</span>
                    <span>Product</span>
                    <span>What you can do</span>
                  </div>
                  <div className="tb">
                    {list.slice(0, expanded[why] ? list.length : SHOWN_PER_CAUSE).map((e, ei) => {
                      const options = STAFF.filter(
                        (s) => s.dep.includes(e.stage) && s.active !== false,
                      ).sort((a, b) => Number(covOK(b.id, e)) - Number(covOK(a.id, e)))
                      return (
                        <div key={key(e)} className="trow" style={{ gridTemplateColumns: COLS }}>
                          <div className="cell">
                            <div className="gr mono" style={{ fontSize: 'var(--t-label)' }}>
                              {ei + 1}
                            </div>
                          </div>
                          <div className="cell">
                            <div className="v mono">{e.o.id}</div>
                            <div className="s">
                              {e.o.cl} · {e.o.co ? `${e.o.co}, ${e.o.st}` : e.o.st}
                            </div>
                          </div>
                          <div className="cell">
                            <div className="v">{e.stage}</div>
                          </div>
                          <div className="cell">
                            <div className="v">{e.o.pr}</div>
                          </div>
                          <div
                            className="cell"
                            style={{
                              display: 'flex',
                              gap: 7,
                              flexWrap: 'wrap',
                              alignItems: 'flex-start',
                            }}
                          >
                            <div style={{ minWidth: 150 }}>
                              <select
                                className="inp"
                                style={{ width: '100%' }}
                                aria-label={`Assign ${e.o.id} ${e.stage} manually`}
                                value=""
                                onChange={(ev) => assign(e, ev.target.value)}
                              >
                                <option value="">— assign anyway —</option>
                                {options.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.n}
                                    {COVSTAGES.includes(e.stage) && !covOK(s.id, e)
                                      ? ' — outside their coverage'
                                      : ''}
                                    {s.avail !== 'ok' ? ` (${AVAIL[s.avail][0].toLowerCase()})` : ''}
                                    {(run.load[s.id] ?? 0) >= s.cap ? ' — over target' : ''}
                                  </option>
                                ))}
                              </select>
                              {e.why === 'coverage' && e.near?.length ? (
                                <div className="s gr" style={{ marginTop: 5 }}>
                                  Closest: {e.near.slice(0, 2).map(whoName).join(', ')} — {e.o.st} but
                                  not {e.o.co}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {list.length > SHOWN_PER_CAUSE ? (
                      <div className="trow" style={{ gridTemplateColumns: '1fr' }}>
                        <div className="cell" style={{ padding: '6px 0' }}>
                          <Btn
                            variant="ghost"
                            small
                            aria-expanded={!!expanded[why]}
                            onClick={() => setExpanded((x) => ({ ...x, [why]: !x[why] }))}
                          >
                            {expanded[why]
                              ? 'Show fewer'
                              : `Show ${list.length - SHOWN_PER_CAUSE} more of the same kind`}
                          </Btn>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}

      {exc.length ? null : (
        <Card>
          <Empty icon="✓">No exceptions. Every stage found an owner inside the rules.</Empty>
        </Card>
      )}
    </>
  )
}
