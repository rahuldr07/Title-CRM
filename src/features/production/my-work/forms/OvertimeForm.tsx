import { useState } from 'react'
import { Banner } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Field, Fields, Form, FormActions, FormAlert } from '@/shared/ui/Form'
import { useFormAlert } from '@/shared/hooks/useFormAlert'
import { Input, Textarea } from '@/shared/ui/Controls'
import { useTimeRules } from '@/domain/attendance/timeRules'
import { hm } from '@/domain/attendance/workingDay'
import { fmtDate } from '@/shared/lib/format'
import { now } from '@/shared/lib/clock'

const MIN_MINUTES = 15

export function OvertimeForm({
  workedMins,
  onCancel,
  onSubmit,
}: {
  workedMins: number
  onCancel: () => void
  onSubmit: (date: string, minutes: number, why: string) => void
}) {
  const { otAfterMins } = useTimeRules()
  const over = Math.max(0, workedMins - otAfterMins)
  const [date, setDate] = useState(fmtDate(now()))
  const [minutes, setMinutes] = useState(String(over || 60))
  const [why, setWhy] = useState('')
  const alert = useFormAlert<'minutes' | 'why'>()

  const submit = () => {
    const n = parseInt(minutes, 10) || 0
    const reason = why.trim()
    if (n < MIN_MINUTES) return alert.fail('At least fifteen minutes, and a reason.', 'minutes')
    if (!reason) return alert.fail('At least fifteen minutes, and a reason.', 'why')
    onSubmit(date.trim(), n, reason)
  }

  return (
    <Form onSubmit={submit}>
      <Fields>
        <Field label="Date">
          <Input
            field
            mono
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Minutes" error={alert.on('minutes')}>
          <Input
            field
            mono
            type="number"
            min={MIN_MINUTES}
            max={480}
            step={15}
            value={minutes}
            onChange={(e) => {
              setMinutes(e.target.value)
              alert.clear()
            }}
          />
        </Field>
      </Fields>

      <Field
        label="Why it was needed"
        hint="Overtime with no reason is impossible to argue for at budget time, and impossible to refuse fairly."
        error={alert.on('why')}
      >
        <Textarea
          field
          rows={3}
          placeholder="What would not have been done otherwise"
          value={why}
          onChange={(e) => {
            setWhy(e.target.value)
            alert.clear()
          }}
        />
      </Field>

      {over ? (
        <Banner kind="b" icon="◔" top={10}>
          Your punches today show {hm(workedMins)} worked against a{' '}
          {otAfterMins / 60}-hour day — {hm(over)} over.
        </Banner>
      ) : null}

      <FormAlert alert={alert} margin="10px 0 0" />

      <FormActions>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn submit>Send for approval</Btn>
      </FormActions>
    </Form>
  )
}
