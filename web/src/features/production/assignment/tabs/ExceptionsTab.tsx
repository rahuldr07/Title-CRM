import { useStageName } from '@/domain/company/naming'
import { useState } from 'react'
import { useGo } from '@/shared/hooks/useGo'
import { Btn } from '@/shared/ui/Button'
import { Select } from '@/shared/ui/Controls'
import { Card } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { Empty } from '@/shared/ui/Banner'
import { useUi } from '@/shared/ui/UiProvider'
import { useSession } from '@/domain/auth/SessionProvider'
import { AVAIL } from '@/data/people'
import { ASSIGN_STAGES, COVSTAGES } from '@/data/org'
import { routeNeeds } from '@/domain/auth/permissions'
import { covOK } from '@/domain/assignment/ruleText'
import type { AssignmentBoard, Exception } from '@/domain/assignment/engine'
import { EXCLUSION, wouldSelfReview, type ExclusionReason } from '@/domain/assignment/narrow'
import { openExceptions, orderAsEdited, orderById, pipelineToday, useOrderState } from '@/domain/orders/orders'
import { setAssignee, targetBreach } from '@/domain/orders/orderWrites'
import { whoName, useStaff } from '@/domain/people/roster'
import { labelOf } from '@/shared/lib/format'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { loadOf, useDayLoads } from '@/domain/orders/dayLoad'
import { Note } from '@/shared/ui/Layout'

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

function stagesIn(list: Exception[], name: (k: string) => string): string {
  const n = list.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.stage]: (acc[e.stage] ?? 0) + 1 }), {})
  return ASSIGN_STAGES.filter((st) => n[st])
    .map((st) => `${name(st)} ×${n[st]}`)
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
  const everyone = useStaff()
  const loads = useDayLoads(everyone)
  const stageName = useStageName()
  const companyNeeds = routeNeeds('company')
  const mayOpenCompany = !companyNeeds || can(companyNeeds)
  const { toast, openModal, closeModal } = useUi()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  useOrderState()

  const { run } = board
  const exc = openExceptions()
  const { orders } = pipelineToday()
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
          <Note plain size="body">
            <b>{whoName(id)}</b> did the {stageName(paired)} on this order, and nobody checks their own work.
            Pick someone else from {stageName(e.stage)}.
          </Note>
        ),
        footer: <Btn onClick={closeModal}>Pick someone else</Btn>,
      })
      return
    }
    const give = (overTarget: boolean) => {
      const refused = setAssignee(me, e.o.id, e.stage, id, { overTarget })
      if (refused) return toast(refused)
      const left = exc.length - 1
      toast(
        `${e.o.id} ${stageName(e.stage)} → ${whoName(id)} · ${left ? `${left} still need a person` : 'every stage is placed'}`,
      )
    }
    const over = targetBreach(e.o.id, e.stage, id)
    if (!over) return give(false)
    openModal({
      title: `${whoName(id)} is at their target`,
      body: <Note plain size="body">{over}</Note>,
      footer: (
        <>
          <Btn variant="ghost" onClick={closeModal}>
            Pick someone else
          </Btn>
          <Btn onClick={() => { closeModal(); give(true) }}>Give it to {whoName(id)} anyway</Btn>
        </>
      ),
    })
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
            {stageName('Doc Req')} is not assigned here — it is an exception branch, given out only when an order
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
            <div className="bt">{deptOut.map(stageName).join(' and ')} has nobody available today</div>
            {deptOut.map((d) => {
              const members = everyone.filter((s) => s.dep.includes(d))
              const allOnLeave = members.every((s) => s.avail === 'leave')
              return (
                <span key={d}>
                  {stageName(d)} is staffed by {members.map((s) => s.n).join(', ')} —{' '}
                  {members.length === 1 ? 'one person, and they are' : 'all of whom are'}{' '}
                  {allOnLeave ? 'on leave' : 'unavailable'}.{' '}
                </span>
              )
            })}
            Any order that needs it today has nowhere to go.
            <div className="bs">This is why a department with one member is worth watching.</div>
          </div>
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
            <Card key={why} bottom={13}>
              <div className="ch">
                <h2>{label}</h2>
                <div className="r">
                  <Chip kind={tone === 'bad' ? 'd' : 'r'}>
                    {list.length} stage{list.length === 1 ? '' : 's'}
                  </Chip>
                </div>
              </div>
              <div className="cb" style={{ paddingBottom: 0 }}>
                <Note bottom={13}>
                  {stagesIn(list, stageName)}. {REMEDY[why as ExclusionReason]}
                </Note>
              </div>
              <FlexTable
                cols={COLS}
                min={700}
                head={['#', 'Order', 'Stage', 'Product', 'What you can do']}
                wrap="none"
              >
                {list.slice(0, expanded[why] ? list.length : SHOWN_PER_CAUSE).map((e, ei) => {
                  const options = everyone.filter(
                    (s) => s.dep.includes(e.stage) && s.active !== false,
                  ).sort((a, b) => Number(covOK(b.id, e)) - Number(covOK(a.id, e)))
                  return (
                    <FlexRow key={key(e)}>
                      <Cell>
                        <div className="gr mono" style={{ fontSize: 'var(--t-label)' }}>
                          {ei + 1}
                        </div>
                      </Cell>
                      <Cell>
                        <div className="v mono">{e.o.id}</div>
                        <div className="s">
                          {e.o.cl} · {e.o.co ? `${e.o.co}, ${e.o.st}` : e.o.st}
                        </div>
                      </Cell>
                      <Cell>
                        <div className="v">{stageName(e.stage)}</div>
                      </Cell>
                      <Cell>
                        <div className="v">{e.o.pr}</div>
                      </Cell>
                      <Cell
                        style={{
                          display: 'flex',
                          gap: 7,
                          flexWrap: 'wrap',
                          alignItems: 'flex-start',
                        }}
                      >
                        <div style={{ minWidth: 150 }}>
                          <Select<string>
                            style={{ width: '100%' }}
                            label={`Assign ${e.o.id} ${stageName(e.stage)} manually`}
                            value=""
                            onChange={(v) => assign(e, v)}
                            options={[
                              ['', '— assign anyway —'],
                              ...options.map(
                                (s) =>
                                  [
                                    s.id,
                                    `${s.n}${COVSTAGES.includes(e.stage) && !covOK(s.id, e) ? ' — outside their coverage' : ''}${
                                      s.avail !== 'ok' ? ` (${labelOf(AVAIL, s.avail)[0].toLowerCase()})` : ''
                                    }${loadOf(loads, s.id) >= s.cap ? ' — over target' : ''}`,
                                  ] as const,
                              ),
                            ]}
                          />
                          {e.why === 'coverage' && e.near?.length ? (
                            <div className="s gr" style={{ marginTop: 5 }}>
                              Closest: {e.near.slice(0, 2).map(whoName).join(', ')} — {e.o.st} but
                              not {e.o.co}
                            </div>
                          ) : null}
                        </div>
                      </Cell>
                    </FlexRow>
                  )
                })}
                {list.length > SHOWN_PER_CAUSE ? (
                  <FlexRow whole>
                    <Cell style={{ padding: '6px 0' }}>
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
                    </Cell>
                  </FlexRow>
                ) : null}
              </FlexTable>
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
