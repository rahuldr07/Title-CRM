import { useStageName } from '@/domain/company/naming'
import { useState } from 'react'
import { useGo } from '@/shared/hooks/useGo'
import { Avatar } from '@/shared/ui/Avatar'
import { Btn, Press } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { Kpi, Kpis } from '@/shared/ui/Kpi'
import { SectionHead } from '@/shared/ui/PageHead'
import { focusSection } from '@/shared/ui/focus'
import { useUi } from '@/shared/ui/UiProvider'
import { ASSIGN_STAGES } from '@/data/org'
import { whoName } from '@/domain/people/roster'
import { fmtHour, initials, TZ } from '@/shared/lib/format'
import { RULE_KIND } from '@/domain/assignment/ruleText'
import { assigneeOn, pipelineToday } from '@/domain/orders/orders'
import type { AssignmentBoard } from '@/domain/assignment/engine'
import type { Arrival } from '@/domain/assignment/day'
import type { Rule } from '@/data/types'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { Inline, Note } from '@/shared/ui/Layout'

const COLS = '40px 130px 80px 90px 80px repeat(5, minmax(96px, 1fr))'

const ARRIVALS = 'as-arrivals'
const focusArrivals = () => focusSection(ARRIVALS)

export function LiveTab({
  board,
  rules,
  onTab,
}: {
  board: AssignmentBoard
  rules: Rule[]
  onTab: (t: 'Exceptions' | 'Rules') => void
}) {
  const navigate = useGo()
  const { openModal, closeModal } = useUi()
  const stageName = useStageName()
  const [hour, setHour] = useState<number | null>(null)

  const { run } = board
  const { orders, placed, open } = pipelineToday()
  const total = orders.length * ASSIGN_STAGES.length
  const peak = Math.max(...run.hourly.map((x) => x.n), 1)

  const shown = hour ? orders.filter((o) => o.hr === hour) : orders.slice(-14).reverse()

  const showTrace = (o: Arrival) => {
    const per = new Map(run.assigns.filter((a) => a.o.id === o.id).map((a) => [a.stage, a]))

    openModal({
      title: `How ${o.id} was assigned`,
      body: (
        <>
          <Note bottom={15}>
            {o.cl} · {o.pr} · {o.st} · arrived {fmtHour(o.hr)}. Each stage was decided independently, in
            order.
          </Note>
          {ASSIGN_STAGES.map((s) => {
            const a = per.get(s)
            const e = run.exc.find((x) => x.o.id === o.id && x.stage === s)
            const steps = a?.trace ?? e?.trace ?? []
            const who = assigneeOn(o.id, s)
            return (
              <Card key={s} bottom={11}>
                <div className="ch" style={{ padding: '11px 15px' }}>
                  <h2 style={{ fontSize: 'var(--t-body)', margin: 0 }}>{stageName(s)}</h2>
                  <div className="r">
                    {who ? (
                      <>
                        <span className="ava" style={{ width: 22, height: 22, fontSize: 'var(--t-mini)' }}>
                          {initials(whoName(who))}
                        </span>
                        <b style={{ fontSize: 'var(--t-small)' }}>{whoName(who)}</b>
                      </>
                    ) : (
                      <Chip kind="d">Not placed</Chip>
                    )}
                  </div>
                </div>
                <div className="cb" style={{ padding: '11px 15px' }}>
                  {steps.map((tr, i) => {
                    const rule = rules.find((r) => r.id === tr.r)
                    return (
                      <div
                        key={`${tr.r}-${i}`}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '34px 1fr 60px',
                          gap: 10,
                          alignItems: 'center',
                          padding: '5px 0',
                          fontSize: 'var(--t-small)',
                        }}
                      >
                        <span
                          className={`chip ${rule ? RULE_KIND[rule.k][1] : 'n'}`}
                          style={{ fontSize: 'var(--t-mini)', padding: '1px 6px' }}
                        >
                          {tr.r}
                        </span>
                        <span>{tr.note}</span>
                        <span
                          className="mono gr"
                          style={{ textAlign: 'right', fontSize: 'var(--t-label)' }}
                        >
                          {tr.left} left
                        </span>
                      </div>
                    )
                  })}
                  {e ? (
                    <div
                      className={`bnr ${who ? 'v' : 'd'}`}
                      style={{ margin: '9px 0 0', padding: '9px 12px', fontSize: 'var(--t-small)' }}
                    >
                      <span className="bi">{who ? '✓' : '⚑'}</span>
                      <div>
                        {e.t}
                        {who ? ` The rules held it; ${whoName(who)} was assigned by hand.` : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </Card>
            )
          })}
        </>
      ),
      footer: (
        <>
          <Btn variant="ghost" onClick={closeModal}>
            Close
          </Btn>
          <Btn
            onClick={() => {
              closeModal()
              onTab('Rules')
            }}
          >
            Open rules
          </Btn>
        </>
      ),
    })
  }

  return (
    <>
      <div className="bnr b">
        <span className="bi">⟳</span>
        <div>
          <div className="bt">Assigning as orders arrive — {orders.length} so far today</div>
          Between 10 and 15 an hour. Each one is placed across all {ASSIGN_STAGES.length} stages the
          moment it lands, so nothing waits for a person to start a batch.
          <div className="bs">
            Exceptions collect in their own queue rather than holding up the rest.
          </div>
        </div>
        <div className="ba">
          <Chip kind="v">Running</Chip>
          <Btn variant="ghost" onClick={() => onTab('Rules')}>
            Rules
          </Btn>
        </div>
      </div>

      <Kpis>
        <Kpi
          title="Arrived today"
          value={orders.length}
          detail={`across ${run.hourly.length} hours`}
          icon="›"
          hint="Every arrival, hour filter cleared"
          onClick={() => {
            setHour(null)
            focusArrivals()
          }}
        />
        <Kpi
          title="Placed"
          value={placed}
          valueTone="ok"
          detail={`of ${total} stages`}
          icon="›"
          hint="Where each stage went"
          onClick={focusArrivals}
        />
        <Kpi
          title="Exceptions"
          value={open}
          tone={open ? 'alert' : undefined}
          detail={open ? 'waiting on a person' : 'none'}
          detailTone={open ? 'bad' : 'ok'}
          icon="›"
          hint="What could not be placed"
          onClick={() => onTab('Exceptions')}
        />
        <Kpi
          title="Self-review avoided"
          value={run.avoided}
          detail="rule working silently"
          detailTone="ok"
          icon="›"
          hint="The rule that did this"
          onClick={() => onTab('Rules')}
        />
      </Kpis>

      <SectionHead id={ARRIVALS}>Arrivals by hour, {TZ} — click to filter</SectionHead>
      <Card padded>
        <div style={{ overflowX: 'auto' }}>
        <div className="hbars">
          {run.hourly.map((h) => {
            const on = hour === h.hr
            return (
              <Press
                className="hbar"
                key={h.hr}
                aria-pressed={on}
                label={`${h.n} orders at ${fmtHour(h.hr)}`}
                title={`${h.n} orders at ${fmtHour(h.hr)}`}
                onClick={() => setHour(on ? null : h.hr)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                <div className="hbar-n mono">{h.n}</div>
                <div className="hbar-t">
                  <div
                    className={`hbar-f${on ? ' on' : ''}`}
                    style={{
                      height: `${(h.n / peak) * 100}%`,
                      opacity: hour !== null && !on ? 0.35 : 1,
                    }}
                  />
                </div>
                <div className="hbar-l mono">{h.hr}:00</div>
              </Press>
            )
          })}
        </div>
        </div>
      </Card>

      <SectionHead>
        {hour ? `Orders that arrived at ${fmtHour(hour)}` : 'Most recent orders'} — click one to see why it
        went where it did
      </SectionHead>
      <FlexTable
        cols={COLS}
        min={980}
        head={['#', 'Order', 'Arrived', 'Product', 'State', ...ASSIGN_STAGES.map(stageName)]}
      >
        {shown.map((o, oi) => (
          <FlexRow key={o.id} onClick={() => showTrace(o)}>
            <Cell>
              <div className="gr mono" style={{ fontSize: 'var(--t-label)' }}>
                {oi + 1}
              </div>
            </Cell>
            <Cell>
              <div className="v mono">{o.id}</div>
              <div className="s">{o.cl}</div>
            </Cell>
            <Cell>
              <div className="v mono">{fmtHour(o.hr)}</div>
            </Cell>
            <Cell>
              <div className="v">{o.pr}</div>
            </Cell>
            <Cell>
              <div className="v mono">{o.st}</div>
            </Cell>
            {ASSIGN_STAGES.map((s) => {
              const who = assigneeOn(o.id, s)
              return (
                <Cell key={s}>
                  {who ? (
                    <Inline gap={6}>
                      <Avatar
                        name={whoName(who)}
                        title={`Open ${whoName(who)}`}
                        style={{ width: 21, height: 21, fontSize: 'var(--t-mini)' }}
                        onClick={() => navigate({ to: '/staff/$personId', params: { personId: who } })}
                      />
                      <span className="v" style={{ fontSize: 'var(--t-label)' }}>
                        {whoName(who).split(' ')[0]}
                      </span>
                    </Inline>
                  ) : (
                    <span className="chip d" style={{ fontSize: 'var(--t-eyebrow)' }}>
                      unplaced
                    </span>
                  )}
                </Cell>
              )
            })}
          </FlexRow>
        ))}
      </FlexTable>
      <Note top={12}>
        Every row is one order across all five stages. Click it for the rule-by-rule trace of how each
        name was chosen.
      </Note>
    </>
  )
}
