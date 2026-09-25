import { useState } from 'react'
import { Btn } from '@/shared/ui/Button'
import { Field, Fields, Form, FormActions, FormAlert } from '@/shared/ui/Form'
import { useFormAlert } from '@/shared/hooks/useFormAlert'
import { Input } from '@/shared/ui/Controls'
import { Note } from '@/shared/ui/Layout'

export function CostForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void
  onSubmit: (what: string, amount: number) => void
}) {
  const [what, setWhat] = useState('')
  const [amount, setAmount] = useState('')
  const alert = useFormAlert<'what' | 'amount'>()

  const submit = () => {
    const amt = parseFloat(amount)
    if (!what.trim() || !(amt > 0)) {
      return alert.fail(
        'Both a description and an amount above zero — a cost line with neither cannot be billed on.',
        what.trim() ? 'amount' : 'what',
      )
    }
    onSubmit(what.trim(), Math.round(amt * 100) / 100)
  }

  return (
    <Form onSubmit={submit}>
      <FormAlert alert={alert} bottom={12} />
      <Fields>
        <Field label="What for" error={alert.on('what')}>
          <Input
            field
            placeholder="County copy fee"
            value={what}
            onChange={(e) => {
              setWhat(e.target.value)
              alert.clear()
            }}
          />
        </Field>
        <Field label="Amount" error={alert.on('amount')}>
          <Input
            field
            mono
            type="number"
            step="0.01"
            min="0"
            placeholder="12.50"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              alert.clear()
            }}
          />
        </Field>
      </Fields>
      <Note top={4}>
        Pass-through costs are billed on at cost. They do not touch the product fee.
      </Note>

      <FormActions>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn submit>Add</Btn>
      </FormActions>
    </Form>
  )
}
