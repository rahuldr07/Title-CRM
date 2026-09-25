import { useState } from 'react'
import { Btn } from '@/shared/ui/Button'
import { Field, Form, FormAlert } from '@/shared/ui/Form'
import { useFormAlert } from '@/shared/hooks/useFormAlert'
import { Input } from '@/shared/ui/Controls'
import type { PayTotals } from '@/domain/payroll/payroll'
import { inr } from '@/domain/company/money'
import { Note } from '@/shared/ui/Layout'

export function ApproveForm({
  expected,
  totals,
  onApprove,
  onCancel,
}: {
  expected: string
  totals: PayTotals
  onApprove: () => void
  onCancel: () => void
}) {
  const [typed, setTyped] = useState('')
  const alert = useFormAlert<'name'>()

  const approve = () => {
    if (typed.trim() !== expected) {
      return alert.fail(`Type ${expected} exactly. Approving payroll should take a deliberate act.`, 'name')
    }
    onApprove()
  }

  return (
    <Form onSubmit={approve}>
      <div className="bnr d" style={{ margin: '0 0 12px' }}>
        <span className="bi">⚑</span>
        <div>
          <div className="bt">After this the month is closed to edits</div>
          {totals.list.length} people, {inr(totals.net)} net. Reopening an approved month should need a
          reason and leave a trace — which is why it is not simply a button.
        </div>
      </div>
      {totals.lop.length ? (
        <Note plain size="body">
          <b>{totals.lop.length}</b> {totals.lop.length === 1 ? 'person has' : 'people have'} unpaid days.
          Confirm those are right — this is the last easy moment.
        </Note>
      ) : null}
      <Field label="Type your name to approve" error={alert.on('name')}>
        <Input
          field
          id="apName"
          placeholder={expected}
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value)
            alert.clear()
          }}
        />
      </Field>
      <FormAlert alert={alert} margin={0} />
      <div className="mf" style={{ marginTop: 16 }}>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn submit>Approve</Btn>
      </div>
    </Form>
  )
}
