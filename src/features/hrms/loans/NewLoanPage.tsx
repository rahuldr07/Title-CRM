import { useState } from 'react'
import { Btn } from '@/shared/ui/Button'
import { Card, Label } from '@/shared/ui/Card'
import { Field, Fields, Form, FormAlert } from '@/shared/ui/Form'
import { useFormAlert } from '@/shared/hooks/useFormAlert'
import { Banner } from '@/shared/ui/Banner'
import { Input, Select, Textarea } from '@/shared/ui/Controls'
import { PageHead } from '@/shared/ui/PageHead'
import { useSession } from '@/domain/auth/SessionProvider'
import { useUi } from '@/shared/ui/UiProvider'
import { LOAN_POLICY, policyCheck } from '@/domain/loans/loans'
import { payslipOf } from '@/domain/payroll/payroll'
import { structureOf } from '@/domain/payroll/structure'
import { inr } from '@/domain/company/money'
import { useGo } from '@/shared/hooks/useGo'
import { PAYMONTHS } from '@/data/hrms'
import { requestLoan, useLoans } from '@/domain/loans/loanStore'
import type { LoanKind } from '@/data/types'
import { Inline, Note } from '@/shared/ui/Layout'

function NewLoan() {
  const go = useGo()
  const { me } = useSession()
  const { toast } = useUi()
  const { loans } = useLoans()

  const [kind, setKind] = useState<LoanKind>('loan')
  const [amt, setAmt] = useState('')
  const [emi, setEmi] = useState('')
  const [note, setNote] = useState('')
  const alert = useFormAlert<'amt' | 'emi' | 'note'>()

  const latestMonth = PAYMONTHS[PAYMONTHS.length - 1]
  const monthlyGross = structureOf(me).gross
  const monthlyNet = latestMonth ? payslipOf(me, latestMonth).net : monthlyGross

  const amount = Number(amt)
  const instalment = Number(emi)
  const existing = loans.filter((l) => l.who === me.id)

  const policy =
    amt && amount > 0 ? policyCheck(kind, amount, monthlyGross, monthlyNet, existing) : { ok: true as const }

  const problem = (): [string, 'amt' | 'emi' | 'note'] | null => {
    if (!amt || amount <= 0) return ['Enter an amount greater than zero.', 'amt']
    if (!emi || instalment <= 0) return ['Enter an EMI greater than zero.', 'emi']
    if (instalment > amount) return ['The EMI cannot be more than the amount itself.', 'emi']
    if (!note.trim()) return ['Say what it is for — the person deciding this will ask otherwise.', 'note']
    if (!policy.ok) return [policy.reason, 'amt']
    return null
  }

  const submit = () => {
    const p = problem()
    if (p) return alert.fail(...p)
    const asked = requestLoan(me, { who: me.id, kind, amt: amount, emi: instalment, note: note.trim() })
    if (!asked.ok) return alert.fail(asked.why)
    toast(`${kind === 'loan' ? 'Staff loan' : 'Salary advance'} request sent`)
    go({ to: '/loans/$loanId', params: { loanId: asked.loan.id } })
  }

  const instalments = amount > 0 && instalment > 0 ? Math.ceil(amount / instalment) : null

  return (
    <>
      <PageHead
        parent={{ to: '/loans', label: 'Loans & advances' }}
        title="New request"
        sub="Checked against policy before it goes to whoever decides it."
      />

      <Form onSubmit={submit}>
        <div className="two">
          <div>
            <Card padded>
              <Label>What you need</Label>
              <Fields>
                <Field label="Type">
                  <Select
                    field
                    id="ln-kind"
                    value={kind}
                    onChange={setKind}
                    options={[
                      ['loan', 'Staff loan'],
                      ['advance', 'Salary advance'],
                    ]}
                  />
                </Field>
                <Field label="Amount" error={alert.on('amt')}>
                  <Input
                    field
                    id="ln-amt"
                    type="number"
                    min={0}
                    value={amt}
                    onChange={(e) => {
                      setAmt(e.target.value)
                      alert.clear()
                    }}
                  />
                </Field>
                <Field label="Monthly instalment (EMI)" error={alert.on('emi')}>
                  <Input
                    field
                    id="ln-emi"
                    type="number"
                    min={0}
                    value={emi}
                    onChange={(e) => {
                      setEmi(e.target.value)
                      alert.clear()
                    }}
                  />
                </Field>
              </Fields>
              {instalments ? (
                <Note top={10}>
                  {instalments} instalment{instalments === 1 ? '' : 's'}, the last one adjusted so it never
                  overshoots the balance.
                </Note>
              ) : null}
            </Card>

            <Card padded top={16}>
              <Field layout="bare" className="lb" style={{ display: 'block' }} label="What it's for" error={alert.on('note')}>
                <Textarea
                  field
                  id="ln-note"
                  value={note}
                  placeholder="e.g. Medical expenses, a family event, home repairs"
                  onChange={(e) => {
                    setNote(e.target.value)
                    alert.clear()
                  }}
                />
              </Field>
            </Card>
          </div>

          <aside>
            <Card padded style={{ position: 'sticky', top: 76 }}>
              <div className="lb">Your numbers</div>
              <div style={{ display: 'grid', gap: 8, marginTop: 10, fontSize: 'var(--t-small)' }}>
                <Inline align={false} justify="space-between">
                  <span>Monthly gross</span>
                  <b className="mono">{inr(monthlyGross)}</b>
                </Inline>
                <Inline align={false} justify="space-between">
                  <span>Monthly net</span>
                  <b className="mono">{inr(monthlyNet)}</b>
                </Inline>
              </div>

              <div className="lb" style={{ marginTop: 20 }}>
                Policy
              </div>
              <div style={{ display: 'grid', gap: 6, marginTop: 8, fontSize: 'var(--t-small)' }}>
                <div>Advance ≤ {LOAN_POLICY.advancePctOfNet}% of monthly net</div>
                <div>Loan ≤ {LOAN_POLICY.loanMultipleOfGross}× monthly gross</div>
                <div>One loan and one advance at a time</div>
              </div>

              {!policy.ok && !alert.fault ? (
                <Banner kind="d" icon="⚑" top={16}>
                  {policy.reason}
                </Banner>
              ) : null}
              <FormAlert alert={alert} top={16} />

              <Btn submit style={{ width: '100%', marginTop: 18 }}>
                Send request
              </Btn>
              <Btn variant="ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => go({ to: '/loans' })}>
                Cancel
              </Btn>
            </Card>
          </aside>
        </div>
      </Form>
    </>
  )
}

export default function NewLoanRoute() {
  return <NewLoan />
}
