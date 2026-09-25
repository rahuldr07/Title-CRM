import { useStageName } from '@/domain/company/naming'
import { useParams, useSearch } from '@tanstack/react-router'
import { useGo } from '@/shared/hooks/useGo'
import { Assumption } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Card, Label } from '@/shared/ui/Card'
import { DetailRow, Rows } from '@/shared/ui/DetailList'
import { Field, Fields, ReadOnly } from '@/shared/ui/Form'
import { PageHead } from '@/shared/ui/PageHead'
import { useSession } from '@/domain/auth/SessionProvider'
import { PAYMONTHS } from '@/data/hrms'
import { LATEST_PAY_MONTH, payCfgOf, runIn, runStateOf, useRuns } from '@/domain/payroll/payruns'
import { useStaff, findPerson } from '@/domain/people/roster'
import { payslipOf, ytd } from '@/domain/payroll/payroll'
import { words } from '@/domain/payroll/amountInWords'
import { fyOfPayMonth } from '@/domain/payroll/fiscalYear'
import { inr, inr2 } from '@/domain/company/money'
import { roleName } from '@/domain/auth/permissions'
import { usePayslipDownloads } from '@/features/hrms/payslips/usePayslipDownloads'
import { fmtUsDate } from '@/shared/lib/format'
import { Inline, Note } from '@/shared/ui/Layout'

function Row({ label, value, tone }: { label: string; value: number; tone?: 'warn' | 'ok' }) {
  return <DetailRow label={label} value={<b className={`mono ${tone ?? ''}`}>{inr2(value)}</b>} />
}

function Total({ label, value, tone }: { label: string; value: number; tone?: 'warn' | 'ok' }) {
  return (
    <Inline align={false} justify="space-between" style={{ padding: '11px 0 0', fontSize: 'var(--t-lead)' }}>
      <b>{label}</b>
      <b className={`mono ${tone ?? ''}`}>{inr2(value)}</b>
    </Inline>
  )
}

function Why({ head, detail }: { head: string; detail: string }) {
  return (
    <div className="rw">
      <span className="gr">·</span>
      <span>
        <b>{head}</b>
        <div className="sd gr">{detail}</div>
      </span>
      <span />
    </div>
  )
}

export default function PayslipDetail() {
  const { personId } = useParams({ from: '/payslips/$personId' })
  const { m } = useSearch({ from: '/payslips/$personId' })
  const navigate = useGo()
  const stageName = useStageName()
  const { me, tenant, can } = useSession()
  const download = usePayslipDownloads()
  const runs = useRuns()
  const staff = useStaff()

  const person = findPerson(staff, personId)
  const month = m && PAYMONTHS.includes(m) ? m : LATEST_PAY_MONTH
  const mine = person?.id === me.id

  if (!person) {
    return (
      <>
        <PageHead
          parent={
            can('pricing')
              ? { to: '/payslips', label: 'Payslips' }
              : { to: '/mypay', label: 'My payslips' }
          }
          title="No such person"
        />
        <Card padded style={{ maxWidth: 560 }}>
          <Note plain size="body" margin={0}>
            Nobody on the roster has that reference.
          </Note>
        </Card>
      </>
    )
  }

  if (!mine && !can('pricing')) {
    return (
      <>
        <PageHead
          parent={{ to: '/mywork', label: 'My work' }}
          title="Not yours to open"
          sub={`${me.n} can only see their own payslips.`}
        />
        <Card padded style={{ maxWidth: 560 }}>
          <Note plain size="body" margin={0}>
            Seeing another person’s pay needs the “See pricing and invoices” permission, which your role
            does not have.
          </Note>
          <div style={{ marginTop: 14 }}>
            <Btn
              onClick={() =>
                navigate({ to: '/payslips/$personId', params: { personId: me.id }, search: { m: month } })
              }
            >
              Open mine instead
            </Btn>
          </div>
        </Card>
      </>
    )
  }

  const run = runIn(runs, month)

  if (mine && !run.published) {
    return (
      <>
        <PageHead parent={{ to: '/mypay', label: 'My payslips' }} title={`${month} is not out yet`} />
        <Card padded style={{ maxWidth: 560 }}>
          <Note plain size="body" margin={0}>
            {month} payroll is <b>{runStateOf(run.state)[0].toLowerCase()}</b>. Payslips appear here the
            moment it is published — nothing is hidden from you, it simply is not final.
          </Note>
        </Card>
      </>
    )
  }

  const s = payslipOf(person, month)
  const cfg = payCfgOf(month)
  const y = ytd(person, month)

  const facts: [string, string | number][] = [
    ['Name', person.n],
    ['Employee ID', person.id.toUpperCase()],
    ['Department', person.dep.map(stageName).join(', ') || '—'],
    ['Role', roleName(person.r)],
    ['Days in month', s.a.days],
    ['Working days', s.a.working],
    ['Paid leave', s.a.paidLeave],
    ['Unpaid days', s.a.lop],
  ]

  return (
    <>
      <PageHead
        parent={mine ? { to: '/mypay', label: 'My payslips' } : { to: '/payroll', label: 'Payroll' }}
        title="Payslip"
        sub={`${person.n} · ${month}`}
        actions={
          <>
            <Btn onClick={() => window.print()}>Print or save as PDF</Btn>
            <Btn variant="ghost" onClick={() => download.payslip(person, month)}>
              Download CSV
            </Btn>
          </>
        }
      />

      <Card padded style={{ maxWidth: 940 }}>
        <Inline align="flex-start" justify="space-between" gap={20} wrap style={{ paddingBottom: 16, borderBottom: '2px solid var(--ink)' }}>
          <div>
            <div style={{ fontSize: 'var(--t-h3)', fontWeight: 700 }}>{tenant.name}</div>
            <div className="gr" style={{ fontSize: 'var(--t-small)' }}>
              Payslip for {month}
              {run.at ? ` · approved ${fmtUsDate(run.at)}` : ''}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="gr" style={{ fontSize: 'var(--t-small)' }}>
              Net pay
            </div>
            <div className="mono" style={{ fontSize: 'var(--t-display)', fontWeight: 700 }}>
              {inr(s.net)}
            </div>
          </div>
        </Inline>

        <Fields style={{ margin: '16px 0 4px' }}>
          {facts.map(([label, v]) => (
            <Field key={label} label={label} as="text">
              <ReadOnly>{String(v)}</ReadOnly>
            </Field>
          ))}
        </Fields>

        <div className="two" style={{ marginTop: 18 }}>
          <div>
            <Label>Earnings</Label>
            {s.earn.map(([label, v]) => (
              <Row key={label} label={label} value={v} />
            ))}
            {s.a.lop ? (
              <Inline align={false} justify="space-between" style={{ padding: '7px 0', fontSize: 'var(--t-small)', color: 'var(--warn)' }}>
                <span>
                  Reduced for {s.a.lop} unpaid day{s.a.lop === 1 ? '' : 's'} at {inr2(s.perDay)} a day
                </span>
                <b className="mono">−{inr2(s.lopAmt)}</b>
              </Inline>
            ) : null}
            <Total label="Gross earnings" value={s.gross} />
          </div>
          <div>
            <Label>Deductions</Label>
            {s.ded.map(([label, v]) => (
              <Row key={label} label={label} value={v} tone="warn" />
            ))}
            <Total label="Total deductions" value={s.totalDed} tone="warn" />
          </div>
        </div>

        {s.reimb.length ? (
          <Card padded top={16} style={{ background: 'var(--tint)' }}>
            <Label>Reimbursed on top of salary</Label>
            {s.reimb.map(([label, v]) => (
              <Row key={label} label={label} value={v} tone="ok" />
            ))}
            <Note top={10}>
              Paid back at cost and not taxed, which is why it sits outside earnings rather than inside
              them.
            </Note>
          </Card>
        ) : null}

        <div
          className="rw"
          style={{ background: 'var(--oktint)', borderRadius: 9, padding: '14px 16px', marginTop: 18 }}
        >
          <span className="ok" style={{ fontSize: 'var(--t-lead)' }}>
            ✓
          </span>
          <span>
            <b style={{ fontSize: 'var(--t-lead)' }}>Net pay {inr2(s.net)}</b>
            <div className="sd">
              Rupees {words(s.net)} · credited to the account on file on the {cfg.payDay}
              {cfg.payDay === 1 ? 'st' : 'th'}
            </div>
          </span>
          <span />
        </div>

        <div className="two" style={{ marginTop: 18 }}>
          <Card padded style={{ background: 'var(--tint)' }}>
            <Label>Paid by the company on top of your salary</Label>
            {s.employer.map(([label, v]) => (
              <Row key={label} label={label} value={v} />
            ))}
            <Note top={10}>
              These do not come out of your pay. They are part of your cost to company, which is why the
              CTC on your letter is higher than twelve times the gross above.
            </Note>
          </Card>
          <Card padded style={{ background: 'var(--tint)' }}>
            <Label>Year to date — {fyOfPayMonth(month)}</Label>
            <Row label="Gross earnings" value={y.gross} />
            <Row label="Deductions" value={y.ded} tone="warn" />
            <Row label="Tax deducted" value={y.tds} tone="warn" />
            <Total label="Net received" value={y.net} tone="ok" />
          </Card>
        </div>

        <div className="lb" style={{ marginTop: 20 }}>
          How these figures were arrived at
        </div>
        <Rows bare>
          <Why
            head={`Basic is ${cfg.basicPct}% of your monthly cost to company`}
            detail="Set by the labour codes, which require basic to be at least half. Everything statutory is calculated from it."
          />
          <Why
            head={`Provident fund is ${cfg.pfPct}% of ${cfg.pfOnFullBasic ? 'basic' : `basic, capped at a ${inr(cfg.pfWageCeiling)} wage`}`}
            detail={`Deducted from you, and matched by the company at ${inr(s.st.epfEr)}.`}
          />
          <Why
            head={
              s.esi
                ? `ESI at ${cfg.esiPct}% applies because gross is under ${inr(cfg.esiGrossLimit)}`
                : `ESI does not apply — gross is above ${inr(cfg.esiGrossLimit)}`
            }
            detail="The threshold is statutory, not a company choice."
          />
          {s.loanDeds.map((d) => (
            <Why
              key={d.loan.id}
              head={`${inr(d.amount)} recovered against your ${d.loan.kind === 'loan' ? 'loan' : 'advance'}`}
              detail={`${inr(d.loan.paid)} of ${inr(d.loan.amt)} repaid so far. ${Math.max(0, Math.ceil((d.loan.amt - d.loan.paid) / d.loan.emi))} instalment${Math.ceil((d.loan.amt - d.loan.paid) / d.loan.emi) === 1 ? '' : 's'} left.`}
            />
          ))}
          {s.arr ? (
            <Why
              head={`Arrears of ${inr(s.arr)} for an earlier month`}
              detail="Taxed in the month it is paid, which is this one."
            />
          ) : null}
          <Why
            head="Tax is this year’s estimate, spread evenly"
            detail="Computed on the new regime with the standard deduction, then divided by twelve. It moves if your declarations change."
          />
        </Rows>

        <Assumption title="Tax here is illustrative">
          The slabs are the new-regime rates and the arithmetic is right, but a real payroll takes
          account of declarations, other income and prior employment.{' '}
          <b>Confirm the numbers with whoever files your returns before anyone is paid on them.</b>
        </Assumption>

        <Note size="label" top={14}>
          Computer-generated. No signature is required.
        </Note>
      </Card>
    </>
  )
}
