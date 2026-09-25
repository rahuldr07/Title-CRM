import { useState } from 'react'
import { Banner } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Field, Fields, Form, FormActions, FormAlert } from '@/shared/ui/Form'
import { useFormAlert } from '@/shared/hooks/useFormAlert'
import type { PettyConfig, PettyEntry } from '@/data/types'
import { inr } from '@/domain/company/money'
import { now } from '@/shared/lib/clock'
import { useStaff } from '@/domain/people/roster'
import { Input, Select } from '@/shared/ui/Controls'

export function EntryForm({
  balance,
  cfg,
  onSubmit,
  onCancel,
}: {
  balance: number
  cfg: PettyConfig
  onSubmit: (entry: Omit<PettyEntry, 'id'>) => void
  onCancel: () => void
}) {
  const staff = useStaff()
  const people = staff.filter((s) => s.active !== false)
  const [kind, setKind] = useState<'debit' | 'credit'>('debit')
  const [amount, setAmount] = useState('')
  const [what, setWhat] = useState('')
  const [by, setBy] = useState(people[0]?.n ?? '')
  const [ref, setRef] = useState('')
  const alert = useFormAlert<'amount' | 'what' | 'ref'>()

  const amt = Number(amount) || 0
  const after = kind === 'credit' ? balance + amt : balance - amt

  const change = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    alert.clear()
  }

  const submit = () => {
    if (!(amt > 0)) return alert.fail('An amount and what it was for.', 'amount')
    if (!what.trim()) return alert.fail('An amount and what it was for.', 'what')
    if (kind === 'debit' && balance - amt < 0)
      return alert.fail('The box does not hold that much. Record the top-up first.', 'amount')
    if (kind === 'debit' && !ref.trim())
      return alert.fail(
        'A receipt or voucher number. Cash out with nothing to show for it is the entry nobody can explain three months later. If there genuinely is no receipt, write “none” and it will be flagged rather than hidden.',
        'ref',
      )

    onSubmit({
      d: now(),
      kind,
      what: what.trim(),
      amt,
      by,
      ref: ref.trim() || '—',
      receipt: !!ref.trim() && ref.trim().toLowerCase() !== 'none',
    })
  }

  return (
    <Form onSubmit={submit}>
      <Fields>
        <Field label="Money in or out">
          <Select
            field
            id="pe-k"
            value={kind}
            onChange={change(setKind)}
            options={[
              ['debit', 'Paid out — debit'],
              ['credit', 'Put in — credit'],
            ]}
          />
        </Field>
        <Field label="Amount" error={alert.on('amount')}>
          <Input
            field
            mono
            id="pe-a"
            type="number"
            min={1}
            step={1}
            placeholder="1240"
            value={amount}
            onChange={(e) => change(setAmount)(e.target.value)}
          />
        </Field>
      </Fields>

      <Field label="What for" error={alert.on('what')}>
        <Input
          field
          id="pe-w"
          placeholder="County copy fees — Cambria"
          autoComplete="off"
          value={what}
          onChange={(e) => change(setWhat)(e.target.value)}
        />
      </Field>

      <Fields>
        <Field label="Who took it">
          <Select field id="pe-b" value={by} onChange={setBy} options={people.map((p) => [p.n, p.n] as const)} />
        </Field>
        <Field label="Receipt or voucher number" error={alert.on('ref')}>
          <Input
            field
            mono
            id="pe-r"
            placeholder="CM-8841"
            autoComplete="off"
            value={ref}
            onChange={(e) => change(setRef)(e.target.value)}
          />
        </Field>
      </Fields>

      <div
        className="rw"
        style={{ background: 'var(--tint)', borderRadius: 9, padding: '12px 14px', marginTop: 6 }}
      >
        <span className="gr">=</span>
        <span>
          <b>
            {inr(balance)} {kind === 'credit' ? '+' : '−'} {inr(amt)} = {inr(after)}
          </b>
          <div className="sd gr">
            The balance after this entry. Worked out here so it is never carried in anyone’s head.
          </div>
        </span>
        <span />
      </div>

      {after < 0 ? (
        <Banner kind="d" icon="⚑" margin="10px 0 0">
          <b>That would take the box below zero.</b> Either the float needs topping up first, or an
          earlier entry is wrong.
        </Banner>
      ) : null}

      {kind === 'debit' && amt > cfg.limit ? (
        <Banner kind="r" icon="⚠" margin="10px 0 0">
          Above the {inr(cfg.limit)} cash ceiling. This should go by bank transfer against an
          invoice, so there is a second record of it.
        </Banner>
      ) : null}

      <FormAlert alert={alert} margin="10px 0 0" />

      <FormActions>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn submit>Record it</Btn>
      </FormActions>
    </Form>
  )
}
