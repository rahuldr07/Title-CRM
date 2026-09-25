import { useStageName } from '@/domain/company/naming'
import { useGo } from '@/shared/hooks/useGo'
import { Avatar } from '@/shared/ui/Avatar'
import { Banner } from '@/shared/ui/Banner'
import { Card } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { SectionHead } from '@/shared/ui/PageHead'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { ShowAll } from '@/shared/ui/ShowAll'
import { useCappedList } from '@/shared/hooks/useCappedList'
import { FocusHead } from '@/features/insight/reports/FocusKpis'
import type { WorkTask } from '@/domain/assignment/workload'
import { useLiveWork } from '@/domain/orders/liveWork'
import { ASSIGN_STAGES } from '@/data/org'
import { AVAIL } from '@/data/people'
import { whoName, useStaff } from '@/domain/people/roster'
import { openExceptions, useOrderState } from '@/domain/orders/orders'
import { fmtHour, labelOf } from '@/shared/lib/format'
import { Inline, Note } from '@/shared/ui/Layout'

const CAUSE: Record<string, [string, string]> = {
  capacity: [
    'Everyone eligible was already at their daily target',
    'Raise the target, add someone to that department, or accept the queue.',
  ],
  unavailable: [
    'Everyone eligible was on leave or off shift',
    'Cover, or a rule that routes elsewhere when a department is empty.',
  ],
  'no-dept': ['Nobody belongs to that department', 'Add a member, or the stage cannot run at all.'],
  self: [
    'The only person free had already done the paired stage',
    'Self-review is blocked, so the work waited rather than being checked by its author.',
  ],
  coverage: [
    'Nobody covers that county or product',
    'Widen somebody’s level, or hire for the place the work keeps arriving from.',
  ],
}

type TodayTask = WorkTask

export function WorkFocus({
  focus,
  mode,
  onBack,
}: {
  focus: string
  mode: 'dept' | 'staff'
  onBack: () => void
}) {
  const { tasks: all, work } = useLiveWork()
  const navigate = useGo()
  const stageName = useStageName()
  const everyone = useStaff()
  useOrderState()
  const exc = openExceptions()

  if (focus === 'exc') {
    const causes: Record<string, typeof exc> = {}
    exc.forEach((e) => {
      ;(causes[e.why] = causes[e.why] ?? []).push(e)
    })
    return (
      <>
        <FocusHead
          title={`${exc.length} stage${exc.length === 1 ? '' : 's'} the engine could not place`}
          onBack={onBack}
        >
          These are not lost — they are waiting for a person to place them by hand. Grouped by why, because
          each cause has a different fix.
        </FocusHead>
        {Object.entries(causes)
          .sort((a, b) => b[1].length - a[1].length)
          .map(([why, list]) => {
            const c = CAUSE[why] ?? [why, '']
            return (
              <div key={why}>
                <SectionHead>
                  {c[0]} — {list.length}
                </SectionHead>
                <Banner kind="r" icon="◷" title="What would clear these">
                  {c[1]}
                </Banner>
                <FlexTable
                  cols="40px 160px 140px 150px 1fr"
                  min={800}
                  head={['#', 'Order', 'Stage', 'Client', 'What happened']}
                >
                  {list.map((e, i) => (
                    <FlexRow cols="40px 160px 140px 150px 1fr" key={`${e.o.id}-${e.stage}-${i}`}>
                      <Cell v={i + 1} mono tone="gr" />
                      <Cell v={e.o.id} mono s={e.o.pr} />
                      <Cell v={stageName(e.stage)} />
                      <Cell v={e.o.cl} />
                      <Cell v={e.t} />
                    </FlexRow>
                  ))}
                </FlexTable>
              </div>
            )
          })}
        <Note top={10}>
          Every one of these arrived today and found no home. The Assignment screen shows the full decision
          trail for any of them.
        </Note>
      </>
    )
  }

  if (focus === 'idle') {
    const roster = everyone.filter((x) => x.dep.length)
    const busy = roster.filter((x) => (work[x.id]?.pend ?? 0) > 0)
    const idle = roster.filter((x) => !busy.includes(x))
    return (
      <>
        <FocusHead title={`${busy.length} of ${roster.length} have work in hand`} onBack={onBack}>
          {idle.length
            ? `${idle.length} finished everything assigned to them, or were never given any. Those are two different situations and the list separates them.`
            : 'Nobody is sitting without work.'}
        </FocusHead>

        <SectionHead>Nothing on their desk — {idle.length}</SectionHead>
        {idle.length ? (
          <FlexTable cols="200px 190px 130px 1fr" min={720} head={['Person', 'Departments', 'Today', 'Why']}>
            {idle.map((x) => {
              const wk = work[x.id] ?? { done: 0, tot: 0 }
              return (
                <FlexRow cols="200px 190px 130px 1fr" key={x.id}>
                  <Cell>
                    <Inline gap={8}>
                      <Avatar
                        name={x.n}
                        title={`Open ${x.n}`}
                        onClick={() => navigate({ to: '/staff/$personId', params: { personId: x.id } })}
                      />
                      <div className="v">{x.n}</div>
                    </Inline>
                  </Cell>
                  <Cell v={x.dep.map(stageName).join(', ')} tone="gr" />
                  <Cell v={wk.tot || 0} mono s={`${wk.done || 0} done`} />
                  {x.avail !== 'ok' ? (
                    <Cell v={`${labelOf(AVAIL, x.avail)[0]} — not eligible today`} tone="warn" />
                  ) : wk.tot ? (
                    <Cell v={`finished all ${wk.tot} of theirs`} tone="ok" />
                  ) : (
                    <Cell v="never given anything — capacity going unused" tone="bad" />
                  )}
                </FlexRow>
              )
            })}
          </FlexTable>
        ) : (
          <Card padded>
            <Note margin={0}>
              Everyone has something in hand.
            </Note>
          </Card>
        )}

        <SectionHead>Working now — {busy.length}</SectionHead>
        <FlexTable cols="200px 190px 110px 1fr" min={680} head={['Person', 'Departments', 'In hand', 'Progress']}>
          {busy
            .slice()
            .sort((a, b) => (work[b.id]?.pend ?? 0) - (work[a.id]?.pend ?? 0))
            .map((x) => {
              const wk = work[x.id]
              if (!wk) return null
              return (
                <FlexRow cols="200px 190px 110px 1fr" key={x.id}>
                  <Cell>
                    <Inline gap={8}>
                      <Avatar name={x.n} />
                      <div className="v">{x.n}</div>
                    </Inline>
                  </Cell>
                  <Cell v={x.dep.map(stageName).join(', ')} tone="gr" />
                  <Cell v={wk.pend} mono tone="warn" />
                  <Cell>
                    <div className="split" style={{ marginTop: 5 }}>
                      <span style={{ width: `${wk.pct}%`, background: 'var(--ok)' }} />
                      <span style={{ width: `${100 - wk.pct}%`, background: 'var(--warn)' }} />
                    </div>
                    <div className="s">
                      {wk.pct}% of {wk.tot} complete
                    </div>
                  </Cell>
                </FlexRow>
              )
            })}
        </FlexTable>
        <Note top={10}>
          "Nobody idle" counts people holding unfinished work. Somebody who cleared their queue is not idle in
          any way worth worrying about — somebody who was never given any is.
        </Note>
      </>
    )
  }

  const list = (focus === 'done' ? all.filter((a) => a.fin) : focus === 'pend' ? all.filter((a) => !a.fin) : all)
    .slice()
    .sort((a, b) => a.hr - b.hr)
  const groups = mode === 'dept' ? ASSIGN_STAGES : [...new Set(list.map((a) => a.who))]

  return (
    <>
      <FocusHead
        title={
          focus === 'done'
            ? `The ${list.length} stages finished today`
            : focus === 'pend'
              ? `The ${list.length} stages still open`
              : `All ${list.length} stage tasks today`
        }
        onBack={onBack}
      >
        One order passes through every department, so a single order appears once per stage. Grouped by{' '}
        {mode === 'dept' ? 'department' : 'person'}.
      </FocusHead>
      {groups.map((g) => {
        const mine = list.filter((a) => (mode === 'dept' ? a.stage === g : a.who === g))
        return mine.length ? <TaskGroup key={g} group={g} mode={mode} tasks={mine} /> : null
      })}
      <Note top={10}>
        Ordered by arrival time, because that is the order the engine placed them in.
      </Note>
    </>
  )
}

const TASK_COLS = '40px 105px 150px 140px 160px 1fr'
const TASK_HEAD = {
  dept: ['#', 'Arrived', 'Order', 'Client', 'Who has it', 'Status'],
  staff: ['#', 'Arrived', 'Order', 'Client', 'Stage', 'Status'],
}

function TaskGroup({ group, mode, tasks }: { group: string; mode: 'dept' | 'staff'; tasks: TodayTask[] }) {
  const stageName = useStageName()
  const shown = useCappedList(tasks, { keyOf: (t) => `${t.o.id}-${t.stage}` })
  return (
    <div>
      <SectionHead>
        {mode === 'dept' ? stageName(group) : whoName(group)} — {tasks.length}
      </SectionHead>
      <FlexTable cols={TASK_COLS} min={840} head={TASK_HEAD[mode]}>
        {shown.shown.map((a, i) => (
          <FlexRow cols={TASK_COLS} key={`${a.o.id}-${a.stage}-${i}`}>
            <Cell v={i + 1} mono tone="gr" />
            <Cell v={fmtHour(a.hr)} mono />
            <Cell v={a.o.id} mono s={a.o.pr} />
            <Cell v={a.o.cl} />
            <Cell v={mode === 'dept' ? whoName(a.who) : stageName(a.stage)} />
            <Cell>{a.fin ? <Chip kind="v">Completed</Chip> : <Chip kind="r">On their desk</Chip>}</Cell>
          </FlexRow>
        ))}
      </FlexTable>
      <ShowAll list={shown} noun="stage tasks" />
    </div>
  )
}
