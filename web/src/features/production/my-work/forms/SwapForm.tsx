import { useState } from 'react'
import { Banner } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Field, Fields, Form, FormActions, FormAlert } from '@/shared/ui/Form'
import { useFormAlert } from '@/shared/hooks/useFormAlert'
import { Input, Select } from '@/shared/ui/Controls'
import { shiftOf } from '@/domain/attendance/workingDay'
import { fmtDate } from '@/shared/lib/format'
import { now } from '@/shared/lib/clock'
import type { Person } from '@/data/types'

export function SwapForm({
  peers,
  onCancel,
  onSubmit,
}: {
  peers: Person[]
  onCancel: () => void
  onSubmit: (to: string, date: string, why: string) => void
}) {
  const soon = new Date(now().getFullYear(), now().getMonth(), now().getDate() + 4)
  const [date, setDate] = useState(fmtDate(soon))
  const [to, setTo] = useState(peers[0]?.id ?? '')
  const [why, setWhy] = useState('')
  const alert = useFormAlert<'date' | 'why'>()

  const submit = () => {
    const reason = why.trim()
    if (!date.trim()) return alert.fail('Which day is being swapped.', 'date')
    if (!reason) return alert.fail('A reason — it is what the approver is deciding on.', 'why')
    onSubmit(to, date.trim(), reason)
  }

  return (
    <Form onSubmit={submit}>
      <Fields>
        <Field label="Which day" error={alert.on('date')}>
          <Input
            field
            mono
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              alert.clear()
            }}
          />
        </Field>
        <Field label="Who">
          <Select
            field
            value={to}
            onChange={setTo}
            options={peers.map((p) => [p.id, `${p.n} — ${shiftOf(p).n}`] as const)}
          />
        </Field>
      </Fields>

      <Field label="Why" error={alert.on('why')}>
        <Input
          field
          placeholder="Enough for whoever approves it"
          value={why}
          onChange={(e) => {
            setWhy(e.target.value)
            alert.clear()
          }}
        />
      </Field>

      <Banner kind="b" icon="⇄" top={10}>
        Agree it with them first. This sends it to your manager for approval, because it changes who
        is covering that day — not because anyone doubts you.
      </Banner>

      <FormAlert alert={alert} margin="10px 0 0" />

      <FormActions>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn submit>Send</Btn>
      </FormActions>
    </Form>
  )
}
