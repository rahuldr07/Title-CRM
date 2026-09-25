import { useStageName } from '@/domain/company/naming'
import { useId, useState } from 'react'
import { useGo } from '@/shared/hooks/useGo'
import { Assumption, Banner } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Card, Label } from '@/shared/ui/Card'
import { SecHead } from '@/shared/ui/PageHead'
import { useUi } from '@/shared/ui/UiProvider'
import { ASSIGN_STAGES } from '@/data/org'
import { PRODUCTS } from '@/data/catalog'
import { allOrders } from '@/domain/orders/orders'
import { budgetOK, curStageOf, hh, orderPlan, shareTotal, stageWindows } from '@/domain/assignment/sla'
import { deliveryOf } from '@/domain/orders/orderState'
import { Due } from '@/shared/ui/Chip'
import { r2 } from '@/shared/lib/format'
import { addOverride, removeOverride, setBuffer, setShare, useBudget } from '@/domain/assignment/turnaround'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { useSession } from '@/domain/auth/SessionProvider'
import { useRefusal } from '@/shared/hooks/useRefusal'
import { Inline, Note } from '@/shared/ui/Layout'
import { Field } from '@/shared/ui/Form'
import { Input, Select } from '@/shared/ui/Controls'
import { MatrixTable, Th } from '@/shared/ui/MatrixTable'

export function StageBudgets() {
  const { me } = useSession()
  const refuse = useRefusal()
  const budget = useBudget()
  const { toast } = useUi()
  const navigate = useGo()
  const stageName = useStageName()
  const [pr, setPr] = useState('base')
  const shareId = useId()

  const ov = pr === 'base' ? null : budget.over.find((x) => x.pr === pr)
  const sh = ov ? ov.shares : budget.base
  const tot = shareTotal(sh)
  const ok = budgetOK(sh)
  const diff = r2(100 - tot)
  const cps = stageWindows(24, budget.buffer, sh)
  const sliceOf = (st: string) => cps.find((c) => c.stage === st)?.hours ?? 0

  const spare = PRODUCTS.map((p) => p.id).filter((id) => !budget.over.some((o) => o.pr === id))

  const risky = allOrders().filter((o) => !o.done)
    .map((o) => ({ o, p: orderPlan(o) }))
    .filter((x) => x.p.behind || x.p.doomed)

  const RCOLS = '40px 150px 130px 150px 1fr 150px'

  return (
    <>
      <SecHead sub="Where due dates come from. Change a number here and every new order moves with it." />

      <Assumption title="The 50/11/25/10/4 split is a default, not a measurement">
        The shares follow how the work reads, not how long it takes.{' '}
        <b>Take a week of finished orders and measure how long each department held them</b> — the
        median is your split. Until then every checkpoint below is the right shape but not yet your
        numbers.
      </Assumption>

      <Banner
        kind="b"
        icon="◷"
        title="A client promise of 24 hours is not a Search department promise of 24 hours"
      >
        If Search finishes in the 23rd hour, {stageName('Search QC')}, Typing, {stageName('Typing QC')} and {stageName('RTS')} have one hour
        between them — which is not a schedule, it’s a hope. Splitting the clock gives each
        department its own checkpoint, and lets the system say an order is unrecoverable at hour 11
        instead of hour 23.
      </Banner>

      <div className="two" style={{ marginTop: 18 }}>
        <Card padded>
          <Label>Share of the clock</Label>
          <div style={{ margin: '10px 0 14px' }}>
            <Select
              style={{ width: '100%', maxWidth: 420 }}
              label="Which products this split applies to"
              value={pr}
              onChange={setPr}
              options={[
                ['base', 'Default — every product without its own split'] as const,
                ...budget.over.map((o) => [o.pr, `${o.pr} — its own split`] as const),
              ]}
            />
          </div>

          {ASSIGN_STAGES.map((st, i) => (
            <div key={st} className="sharerow">
              <Field layout="bare" className="sh-n" label={stageName(st)}>
                <Input
                  field
                  bare
                  id={`${shareId}-${i}`}
                  className="sh-r"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  label={`${stageName(st)} share of the clock`}
                  value={sh[st] ?? 0}
                  onChange={(e) => refuse(setShare(me, pr, st, e.target.value))}
                />
              </Field>
              <div className="sh-p">
                <Input
                  mono
                  type="number"
                  min={0}
                  max={100}
                  style={{ width: 62 }}
                  label={`${stageName(st)} share as a percentage`}
                  value={sh[st] ?? 0}
                  onChange={(e) => refuse(setShare(me, pr, st, e.target.value))}
                />
                <span className="gr" style={{ fontSize: 'var(--t-label)' }}>
                  %
                </span>
              </div>
              <span className="mono gr sh-h">{hh(sliceOf(st))}</span>
            </div>
          ))}

          <div
            className="rw"
            style={{
              marginTop: 12,
              background: ok ? 'var(--oktint)' : 'var(--warntint)',
              borderRadius: 9,
              padding: '11px 13px',
            }}
          >
            <span className={ok ? 'ok' : 'warn'} style={{ fontSize: 'var(--t-lead)' }}>
              {ok ? '✓' : '⚠'}
            </span>
            <span>
              <b>
                {ok
                  ? 'The split accounts for the whole clock'
                  : diff > 0
                    ? `${diff}% unallocated`
                    : `${Math.abs(diff)}% over`}
              </b>
              <div className="sd">
                {ok
                  ? 'Every hour of the working window belongs to a department.'
                  : diff > 0
                    ? 'Unallocated time is time nobody owns — the checkpoints will be looser than they look.'
                    : 'The stages promise more time than the clock has. Checkpoints past the deadline are meaningless.'}
              </div>
            </span>
            <span className={`mono ${ok ? 'ok' : 'warn'}`} style={{ fontWeight: 700 }}>
              {r2(tot)}%
            </span>
          </div>

          <Field
            label="Buffer held back at the end"
            id="bufin"
            style={{ marginTop: 16 }}
            hint={
              <>
                The stages divide the remaining {100 - budget.buffer}%. Without a buffer the last upload lands
                on the deadline itself, and any hiccup is a breach.
              </>
            }
          >
            <Inline gap={9}>
              <Input
                field
                mono
                type="number"
                min={0}
                max={50}
                style={{ width: 80 }}
                defaultValue={budget.buffer}
                key={`buf-${budget.buffer}`}
                onBlur={(e) => refuse(setBuffer(me, e.target.value))}
              />
              <span className="gr" style={{ fontSize: 'var(--t-small)' }}>
                % · on a 24h order that is {hh((24 * budget.buffer) / 100)} of slack before the
                client is let down
              </span>
            </Inline>
          </Field>

          {pr === 'base' ? (
            <Btn
              variant="ghost"
              small
              style={{ marginTop: 14 }}
              disabled={!spare.length}
              onClick={() => {
                const [next] = spare
                if (!next) return
                refuse(addOverride(me, next))
                setPr(next)
                toast(`${next} now has its own split`)
              }}
            >
              ＋ Give a product its own split
            </Btn>
          ) : (
            <Inline align={false} gap={8} style={{ marginTop: 14 }}>
              <Btn
                variant="ghost"
                small
                onClick={() => {
                  refuse(removeOverride(me, pr))
                  setPr('base')
                  toast(`${pr} falls back to the default split`)
                }}
              >
                Remove this override
              </Btn>
              <span className="gr" style={{ fontSize: 'var(--t-label)', alignSelf: 'center' }}>
                {pr} orders would fall back to the default split
              </span>
            </Inline>
          )}
        </Card>

        <Card padded>
          <Label>What each department must hit</Label>
          <Note margin="6px 0 12px">
            Cumulative, measured from when the order arrived. Shown for a 24-hour promise
            {pr === 'base' ? '' : ` on a ${pr}`}.
          </Note>
          <div className="tsc">
            <MatrixTable label="Checkpoint each department must hit" min={340}>
              <thead>
                <tr>
                  <Th>Department</Th>
                  <Th num>Its slice</Th>
                  <Th num>Done by</Th>
                </tr>
              </thead>
              <tbody>
                {cps.map((c) => (
                  <tr key={c.stage}>
                    <td>
                      <b>{stageName(c.stage)}</b>
                    </td>
                    <td className="n mono">{hh(c.hours)}</td>
                    <td className="tot">{hh(c.by)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="gr">Buffer</td>
                  <td className="n mono gr">{hh((24 * budget.buffer) / 100)}</td>
                  <td className="tot corner">24h</td>
                </tr>
              </tbody>
            </MatrixTable>
          </div>

          <div style={{ marginTop: 20 }}>
            <Label>The same split on other promises</Label>
          </div>
          <div className="tsc">
            <MatrixTable label="Checkpoints on other turnaround promises" min={340}>
              <thead>
                <tr>
                  <Th>Promise</Th>
                  {ASSIGN_STAGES.map((st) => (
                    <Th key={st} num>
                      {stageName(st)}
                    </Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[4, 24, 48, 72].map((H) => {
                  const run = stageWindows(H, budget.buffer, sh)
                  return (
                    <tr key={H}>
                      <td>
                        <b>{H}h</b>
                        {H === 4 ? (
                          <span className="gr" style={{ fontSize: 'var(--t-eyebrow)' }}>
                            {' '}
                            rush
                          </span>
                        ) : null}
                      </td>
                      {run.map((c) => (
                        <td key={c.stage} className="n mono">
                          {hh(c.by)}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </MatrixTable>
          </div>
          <Note top={10}>
            Because the split is a percentage, a 4-hour rush is governed by the same setting as a
            72-hour full search. Watch the rush row: {stageName(ASSIGN_STAGES[1] ?? '')} gets{' '}
            {hh(stageWindows(4, budget.buffer, sh)[1]?.hours ?? 0)}. If that is
            unrealistic, a rush needs its own split rather than a smaller slice of the same one.
          </Note>
        </Card>
      </div>

      <h2 className="sec">What this catches right now</h2>
      {risky.length ? (
        <>
          <FlexTable
            cols={RCOLS}
            min={820}
            head={['#', 'Order', 'Client', 'Stage', 'Why it is flagged', 'Deadline']}
          >
            {risky.map(({ o, p }, ri) => (
              <FlexRow
                key={o.id}
                onClick={() => navigate({ to: '/orders/$orderId', params: { orderId: o.id } })}
              >
                <Cell>
                  <div className="gr mono" style={{ fontSize: 'var(--t-label)' }}>
                    {ri + 1}
                  </div>
                </Cell>
                <Cell>
                  <div className="v mono">{o.id}</div>
                </Cell>
                <Cell>
                  <div className="v">{o.cl}</div>
                  <div className="s">{o.pr}</div>
                </Cell>
                <Cell>
                  <div className="v">{stageName(curStageOf(o) ?? '—')}</div>
                </Cell>
                <Cell>
                  <div className={`v ${p.doomed ? 'bad' : 'warn'}`} style={{ fontSize: 'var(--t-small)' }}>
                    {p.doomed
                      ? `The stages still to run need ${hh(p.needs)} and only ${
                          p.remaining > 0 ? hh(p.remaining) : '0h'
                        } remains — short by ${hh(p.short)}`
                      : `Past its ${stageName(p.rows.find((r) => r.behind)?.stage ?? '')} checkpoint`}
                  </div>
                </Cell>
                <Cell>
                  <Due at={o.due} sent={deliveryOf(o)} />
                </Cell>
              </FlexRow>
            ))}
          </FlexTable>
          <Note top={10}>
            Every one of these was knowable hours ago. Without stage budgets none of them is visible
            until the client deadline itself passes.
          </Note>
        </>
      ) : (
        <Card padded>
          <Note margin={0}>
            No open order has missed a departmental checkpoint. Raise a share above and this list
            will fill — it is computed, not stored.
          </Note>
        </Card>
      )}
    </>
  )
}
