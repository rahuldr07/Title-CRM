import { useStageName } from '@/domain/company/naming'
import { Banner } from '@/shared/ui/Banner'
import { Card, Label } from '@/shared/ui/Card'
import { Field, Fields, ReadOnly } from '@/shared/ui/Form'
import { Input, Select } from '@/shared/ui/Controls'
import { LinkButton } from '@/shared/ui/Button'
import { Rows } from '@/shared/ui/DetailList'
import type { Go } from '@/shared/hooks/useGo'
import { PRODUCTS } from '@/data/catalog'
import type { EditedOrder, OrderEdits, OrderParties } from '@/domain/orders/orders'
import { hh, type OrderPlan } from '@/domain/assignment/sla'
import { currentDateFormat, fmtDT, toIst, TZ, TZ2 } from '@/shared/lib/format'
import { now } from '@/shared/lib/clock'
import { isStatus } from './orderDetail'
import { statusName, useStatuses } from '@/domain/company/statuses'
import { Note } from '@/shared/ui/Layout'

interface Props {
  o: EditedOrder
  parties: OrderParties
  plan: OrderPlan
  pricing: boolean
  statusKeys: readonly string[]
  statusWhy: string | null
  mayOpenCompany: boolean
  navigate: Go
  field: <K extends keyof OrderEdits>(key: K, value: OrderEdits[K]) => void
  locks: { header: string | null; findings: string | null }
}

export function OrderDetailsTab({ o, parties, plan, pricing, statusKeys, statusWhy, mayOpenCompany, navigate, field, locks }: Props) {
  const sla = plan.rule
  const statuses = useStatuses()
  const stageName = useStageName()
  return (
    <>
      <Card padded>
        <Label>Order</Label>
        {locks.header || locks.findings ? (
          <Banner kind="b" icon="◔" margin="0 0 14px">
            {[locks.header, locks.findings].filter(Boolean).join(' ')}
          </Banner>
        ) : null}
        <Fields>
          <Field label="Order no" as="text">
            <ReadOnly>
              <span className="mono">{o.id}</span>
            </ReadOnly>
          </Field>
          <Field
            label="Product"
            hint="Changing the product re-reads the SLA, so the due date and every stage checkpoint move with it."
          >
            <Select
              field
              value={o.pr}
              disabled={!!locks.header}
              onChange={(v) => field('pr', v)}
              options={PRODUCTS.map((p) => [p.id, `${p.id} — ${p.n}`] as const)}
            />
          </Field>
          <Field label="Stage" hint={statusWhy ?? undefined}>
            <Select<string>
              field
              value={o.stt}
              onChange={(next) => {
                if (isStatus(next)) field('stt', next)
              }}
              options={statuses.filter(([k]) => k === o.stt || statusKeys.includes(k)).map(([k]) => [k, statusName(k, statuses)] as const)}
            />
          </Field>
          <Field label="Client" as="text">
            <ReadOnly>{o.cl}</ReadOnly>
          </Field>
          <Field label="Borrower">
            <Input
              field
              placeholder="not captured"
              value={parties.borrower}
              disabled={!!locks.header}
              onChange={(e) => field('bw', e.target.value)}
            />
          </Field>
          <Field label="Effective date">
            <Input
              field
              mono
              placeholder={`${currentDateFormat()} — not captured`}
              value={parties.effective}
              disabled={!!locks.findings}
              onChange={(e) => field('ef', e.target.value)}
            />
          </Field>
          <Field label="Prior effective date" hint="Update searches run forward from here.">
            <Input
              field
              mono
              placeholder={`${currentDateFormat()} — not captured`}
              value={parties.priorEffective}
              disabled={!!locks.findings}
              onChange={(e) => field('oe', e.target.value)}
            />
          </Field>
          <Field label="Parcel ID">
            <Input
              field
              mono
              placeholder="not captured"
              value={parties.parcel}
              disabled={!!locks.findings}
              onChange={(e) => field('pi', e.target.value)}
            />
          </Field>
          {pricing ? (
            <Field label="Loan amount">
              <Input
                field
                mono
                placeholder="not captured"
                value={parties.loanAmount}
                disabled={!!locks.header}
              onChange={(e) => field('la', e.target.value)}
              />
            </Field>
          ) : null}
          <Field label="Property address" wide>
            <Input field id="o-ad" value={parties.address} disabled={!!locks.header}
              onChange={(e) => field('ad', e.target.value)} />
          </Field>
          <Field label="Names run" wide>
            <Input
              field
              id="o-nr"
              placeholder="each name indexed separately for judgment and lien"
              value={parties.namesRun}
              disabled={!!locks.findings}
              onChange={(e) => field('nr', e.target.value)}
            />
          </Field>
        </Fields>
      </Card>

      <Card padded top={16}>
        <Label>Turnaround</Label>
        <Fields>
          <Field label="Received" as="text">
            <ReadOnly>
              <span className="mono">
                {fmtDT(o.recv)} {TZ}
              </span>
            </ReadOnly>
          </Field>
          <Field label="SLA applied" as="text">
            <ReadOnly>
              {sla.cl} × {sla.pr} — {sla.h}h
            </ReadOnly>
          </Field>
          <Field label="Due" as="text">
            <ReadOnly>
              <span className="mono" style={{ color: o.due < now() ? 'var(--bad)' : 'var(--ink)' }}>
                {fmtDT(o.due)} {TZ}
              </span>
            </ReadOnly>
          </Field>
          <Field label="Local time" as="text">
            <ReadOnly>
              <span className="mono">
                {fmtDT(toIst(o.due))} {TZ2}
              </span>
            </ReadOnly>
          </Field>
        </Fields>
        {o.flag ? (
          <Banner kind="r" icon="◷" title="Clock paused" margin="14px 0 0">
            {o.flag}
            <div className="bs">Time waiting on the client is not counted against the SLA.</div>
          </Banner>
        ) : null}
      </Card>

      <Card padded top={16}>
        <Label>Stage checkpoints</Label>
        <Note margin="6px 0 14px">
          The {plan.slaH}-hour promise divided between the departments. Each row is the latest
          that stage can finish and still leave the rest of the pipeline the time it needs.
        </Note>

        {plan.doomed ? (
          <Banner
            kind="r"
            icon="⚑"
            title="This order cannot be delivered on time"
            margin="0 0 14px"
          >
            The stages still to run need <b>{hh(plan.needs)}</b> of work and only{' '}
            <b>{plan.remaining > 0 ? hh(plan.remaining) : 'no time'}</b> remains — short by{' '}
            <b>{hh(plan.short)}</b>.
            <div className="bs">
              Tell the client now, or move it to someone who can compress the remaining stages.
              Waiting does not make this better.
            </div>
          </Banner>
        ) : plan.behind ? (
          <Banner
            kind="r"
            icon="◷"
            title="Behind its internal checkpoint"
            margin="0 0 14px"
          >
            Still deliverable — {hh(plan.remaining)} left against {hh(plan.needs)} of remaining
            work — but the slack is being spent.
          </Banner>
        ) : null}

        <Rows bare>
          {plan.rows.map((r) => (
            <div className="rw" key={r.stage}>
              <span
                className={r.done ? 'ok' : r.behind ? 'bad' : r.current ? 'warn' : 'gr'}
                style={{ fontSize: 'var(--t-lead)' }}
              >
                {r.done ? '✓' : r.behind ? '⚑' : r.current ? '◷' : '·'}
              </span>
              <span>
                <b>{stageName(r.stage)}</b>
                <div className="sd">
                  {r.done
                    ? 'done'
                    : r.behind
                      ? `overdue — should have finished by ${fmtDT(r.at)} ${TZ}`
                      : r.current
                        ? `in progress — due by ${fmtDT(r.at)} ${TZ}`
                        : `by ${fmtDT(r.at)} ${TZ}`}
                </div>
              </span>
              <span className="mono gr" style={{ fontSize: 'var(--t-label)' }}>
                {r.pct}% · {hh(r.hours)}
              </span>
            </div>
          ))}
          <div className="rw">
            <span className="gr">·</span>
            <span>
              <b className="gr">Buffer</b>
              <div className="sd">
                {hh((plan.slaH * plan.buffer) / 100)} of slack before the client deadline at{' '}
                {fmtDT(o.due)} {TZ}
              </div>
            </span>
            <span className="mono gr" style={{ fontSize: 'var(--t-label)' }}>
              {plan.buffer}%
            </span>
          </div>
        </Rows>

        <Note top={12}>
          Set under{' '}
          {mayOpenCompany ? (
            <LinkButton
              onClick={() =>
                navigate({
                  to: '/company',
                  search: { tab: 'Turnaround & SLA', sub: 'Stage budgets' },
                })
              }
            >
              Turnaround &amp; SLA → Stage budgets
            </LinkButton>
          ) : (
            'Company → Turnaround & SLA → Stage budgets, by whoever runs the company'
          )}
          .
        </Note>
      </Card>
    </>
  )
}
