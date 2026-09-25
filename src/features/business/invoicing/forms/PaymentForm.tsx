import { useState } from 'react'
import { Btn } from '@/shared/ui/Button'
import { Field, Fields, Form, FormActions, FormAlert } from '@/shared/ui/Form'
import { useFormAlert } from '@/shared/hooks/useFormAlert'
import { Input } from '@/shared/ui/Controls'
import { Note } from '@/shared/ui/Layout'
import { money, r2 } from '@/shared/lib/format'
import { recordPayment } from '@/domain/invoices/payments'
import { useSession } from '@/domain/auth/SessionProvider'
import { balance } from '@/domain/invoices/invoices'
import type { Invoice } from '@/data/types'

export function PaymentForm({
  invoice,
  onCancel,
  onDone,
}: {
  invoice: Invoice
  onCancel: () => void
  onDone: (message: string) => void
}) {
  const [amount, setAmount] = useState(balance(invoice).toFixed(2))
  const alert = useFormAlert<'amount'>()
  const { me } = useSession()

  const submit = () => {
    const n = parseFloat(amount)
    const refused = recordPayment(me, invoice.id, n)
    if (refused) return alert.fail(refused, 'amount')
    const left = r2(balance(invoice) - n)
    onDone(left > 0 ? `${money(n)} recorded — ${money(left)} still owed on ${invoice.id}` : `${invoice.id} is paid in full`)
  }

  return (
    <Form onSubmit={submit}>
      <Note size="body" plain>
        {invoice.cl} · {invoice.m} · {money(balance(invoice))} owed of {money(invoice.amt)}.
      </Note>
      <Fields>
        <Field label="Amount received" hint="Held for this session until the server accepts writes." error={alert.on('amount')}>
          <Input
            field
            mono
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              alert.clear()
            }}
          />
        </Field>
      </Fields>
      <FormAlert alert={alert} margin="12px 0 0" />
      <FormActions>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn submit>Record</Btn>
      </FormActions>
    </Form>
  )
}
