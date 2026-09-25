import { useStageName } from '@/domain/company/naming'
import { useGo } from '@/shared/hooks/useGo'
import { Btn } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { deliveryOf } from '@/domain/orders/orderState'
import { Due } from '@/shared/ui/Chip'
import { SectionHead } from '@/shared/ui/PageHead'
import type { DayLoad } from '@/domain/orders/dayLoad'
import { dueOf, orderPlan } from '@/domain/assignment/sla'
import { fmtDT, fmtHour, TZ } from '@/shared/lib/format'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { Note } from '@/shared/ui/Layout'

const QCOLS = '40px 150px 120px 170px 1fr 150px 110px'
const QMIN = 964

export function MyQueue({ open, done }: { open: DayLoad['items']; done: number }) {
  const navigate = useGo()
  const stageName = useStageName()
  return (
    <section className="mw-queue">
      <SectionHead id="mwQueue">
        {open.length ? `Your queue — ${open.length} to do` : 'Your queue is clear'}
      </SectionHead>

      {open.length ? (
        <>
          <FlexTable
            cols={QCOLS}
            min={QMIN}
            head={['#', 'Order', 'Client', 'Your stage', 'Property', 'Due', '']}
          >
            {open.map(({ o, stage, hr }, i) => {
              const plan = orderPlan(o)
              const cp = plan.rows.find((r) => r.stage === stage)
              const openOrder = () =>
                navigate({ to: '/orders/$orderId', params: { orderId: o.id } })
              return (
                <FlexRow key={`${o.id}-${stage}-${i}`} onClick={openOrder}>
                  <Cell>
                    <div className="gr mono" style={{ fontSize: 'var(--t-label)' }}>
                      {i + 1}
                    </div>
                  </Cell>
                  <Cell>
                    <div className="v mono">{o.id}</div>
                    <div className="s">arrived {fmtHour(hr)}</div>
                  </Cell>
                  <Cell>
                    <div className="v">{o.cl}</div>
                    <div className="s">{o.pr}</div>
                  </Cell>
                  <Cell>
                    <div className="v">{stageName(stage)}</div>
                    {cp?.behind ? (
                      <div className="s bad">past your checkpoint</div>
                    ) : cp ? (
                      <div className="s gr">by {fmtDT(cp.at)} {TZ}</div>
                    ) : null}
                  </Cell>
                  <Cell>
                    <div className="v" style={{ fontSize: 'var(--t-small)' }}>
                      {o.co ? `${o.co}, ${o.st}` : '—'}
                    </div>
                  </Cell>
                  <Cell>
                    <Due at={dueOf(o)} sent={deliveryOf(o)} />
                  </Cell>
                  <Cell>
                    <Btn variant="ghost" small onClick={openOrder}>
                      Open
                    </Btn>
                  </Cell>
                </FlexRow>
              )
            })}
          </FlexTable>
          <Note top={10}>
            Ordered by when it arrived. Your checkpoint is your department’s slice of the client’s
            promise — not the client deadline itself, which is later.
          </Note>
        </>
      ) : (
        <Card padded>
          <Note margin={0}>
            Everything assigned to you today is done. {done} stage{done === 1 ? '' : 's'}{' '}
            finished.
          </Note>
        </Card>
      )}
    </section>
  )
}
