import { useState } from 'react'
import { Assumption, Banner } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Card, CardHead } from '@/shared/ui/Card'
import { FormActions } from '@/shared/ui/Form'
import { SecHead } from '@/shared/ui/PageHead'
import { useUi } from '@/shared/ui/UiProvider'
import { PRODUCTS } from '@/data/catalog'
import { defaultRule, isDefaultRule } from '@/domain/assignment/sla'
import { removeSla, setSlaHours, useSla } from '@/domain/assignment/turnaround'
import { AddSlaForm } from '@/features/configure/company/forms/AddSlaForm'
import { ClockRuns } from '@/features/configure/company/ClockRuns'
import { StageBudgets } from '@/features/configure/company/StageBudgets'
import { underPromised } from '@/features/configure/company/slaRules'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { useSession } from '@/domain/auth/SessionProvider'
import { useRefusal } from '@/shared/hooks/useRefusal'
import { Note } from '@/shared/ui/Layout'
import { Seg } from '@/shared/ui/Tabs'
import { Input } from '@/shared/ui/Controls'

const SUBS = ['Client promise', 'Stage budgets', 'How the clock runs'] as const
type Sub = (typeof SUBS)[number]

export function SlaTab({ initialSub }: { initialSub?: string }) {
  const [sub, setSub] = useState<Sub>(
    SUBS.includes(initialSub as Sub) ? (initialSub as Sub) : 'Client promise',
  )

  return (
    <>
      <Seg style={{ marginBottom: 18 }} options={SUBS.map((x) => [x, x] as const)} value={sub} onChange={setSub} />
      {sub === 'Client promise' ? <ClientPromise /> : null}
      {sub === 'Stage budgets' ? <StageBudgets /> : null}
      {sub === 'How the clock runs' ? <ClockRuns /> : null}
    </>
  )
}

function ClientPromise() {
  const { me } = useSession()
  const refuse = useRefusal()
  const sla = useSla()
  const { openModal, closeModal, toast } = useUi()

  const fb = defaultRule(sla)
  const under = underPromised(sla, PRODUCTS)

  const addRule = () =>
    openModal({
      title: 'Add a turnaround rule',
      body: <AddSlaForm onCancel={closeModal} onDone={(m) => { closeModal(); toast(m) }} />,
    })

  const confirmRemove = (i: number) => {
    const r = sla[i]
    if (!r) return
    openModal({
      title: 'Remove this rule?',
      body: (
        <>
          <Note plain size="body">
            <b>
              {r.cl} · {r.pr}
            </b>{' '}
            is promised in {r.h}h. Without it, those orders fall back to {fb.h}h.
          </Note>
          <FormActions>
            <Btn variant="ghost" onClick={closeModal}>
              Keep it
            </Btn>
            <Btn
              variant="danger"
              onClick={() => {
                refuse(removeSla(me, i))
                closeModal()
                toast(`${r.cl} · ${r.pr} removed`)
              }}
            >
              Remove
            </Btn>
          </FormActions>
        </>
      ),
    })
  }

  const COLS = '170px 150px 150px 1fr 110px'

  return (
    <>
      <SecHead
        sub="Where due dates come from. Change a number here and every new order moves with it."
        actions={<Btn onClick={addRule}>＋ Add rule</Btn>}
      />

      {under.length ? (
        <Banner
          kind="d"
          icon="⚠"
          title={`${under.length} product${under.length === 1 ? ' is' : 's are'} promised faster than ${
            under.length === 1 ? 'it takes' : 'they take'
          }`}
          actions={
            <Btn variant="ghost" small onClick={addRule}>
              Add a rule
            </Btn>
          }
        >
          {under.map((p) => `${p.id} (${p.n}) needs about ${p.h}h`).join(', ')} — but{' '}
          {under.length === 1 ? 'it has' : 'they have'} no rule, so{' '}
          {under.length === 1 ? 'it inherits' : 'they inherit'} the {fb.h}h fallback.
          <div className="bs">
            Either add a rule for {under.length === 1 ? 'it' : 'them'} or accept that the due date
            will be wrong from the moment the order arrives.
          </div>
        </Banner>
      ) : null}

      <Assumption title="These hours are defaults">
        They are not your client commitments yet.{' '}
        <b>Replace them with what you have promised each client</b> — every due date is only as
        right as this table.
      </Assumption>

      <Card>
        <CardHead
          title="Turnaround by client and product"
          actions={
            <span className="gr" style={{ fontSize: 'var(--t-small)' }}>
              most specific rule wins
            </span>
          }
        />
        <FlexTable
          cols={COLS}
          min={800}
          head={['Client', 'Product', 'Turnaround', 'Applies to', '']}
          wrap="none"
        >
          {sla.map((s, i) => (
            <FlexRow key={`${s.cl}-${s.pr}-${i}`}>
              <Cell>
                <div className={`v ${isDefaultRule(s) ? 'gr' : ''}`}>{s.cl}</div>
              </Cell>
              <Cell>
                <div className="v">{s.pr}</div>
              </Cell>
              <Cell>
                <Input
                  mono
                  type="number"
                  min={1}
                  max={336}
                  style={{ width: 82 }}
                  label={`Turnaround hours for ${s.cl} ${s.pr}`}
                  defaultValue={s.h}
                  key={`h-${i}-${s.h}`}
                  onBlur={(e) => refuse(setSlaHours(me, i, e.target.value))}
                />{' '}
                <span className="gr" style={{ fontSize: 'var(--t-label)' }}>
                  hours
                </span>
              </Cell>
              <Cell>
                <div className="v gr" style={{ fontSize: 'var(--t-small)' }}>
                  {isDefaultRule(s)
                    ? 'anything without a specific rule'
                    : `${s.cl} orders for ${s.pr}`}
                </div>
              </Cell>
              <Cell {...(isDefaultRule(s) ? { label: 'Rule' } : {})}>
                {isDefaultRule(s) ? (
                  <span className="gr" style={{ fontSize: 'var(--t-label)' }}>
                    the fallback
                  </span>
                ) : (
                  <Btn variant="ghost" small onClick={() => confirmRemove(i)}>
                    Remove
                  </Btn>
                )}
              </Cell>
            </FlexRow>
          ))}
        </FlexTable>
      </Card>

      <Note top={10}>
        The last row is the fallback and cannot be removed — every order needs a turnaround, even
        one from a client you have no rule for.
      </Note>
    </>
  )
}
