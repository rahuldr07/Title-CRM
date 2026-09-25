import { useState } from 'react'
import { Btn } from '@/shared/ui/Button'
import { Field, Form, FormActions, FormAlert } from '@/shared/ui/Form'
import { useFormAlert } from '@/shared/hooks/useFormAlert'
import { Select, Textarea } from '@/shared/ui/Controls'
import { QC_CRITERIA } from '@/domain/quality/quality'

export function DefectForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void
  onSubmit: (criterion: string, note: string) => void
}) {
  const [criterion, setCriterion] = useState(QC_CRITERIA[0]?.[0] ?? '')
  const [note, setNote] = useState('')
  const alert = useFormAlert<'note'>()

  const submit = () => {
    if (!note.trim()) {
      return alert.fail('Say what was wrong. That sentence is the whole value of the record.', 'note')
    }
    onSubmit(criterion, note.trim())
  }

  return (
    <Form onSubmit={submit}>
      <FormAlert alert={alert} bottom={12} />
      <Field label="Which criterion">
        <Select field value={criterion} onChange={setCriterion} options={QC_CRITERIA.map(([name]) => [name, name] as const)} />
      </Field>

      <Field
        label="What was wrong"
        error={alert.on('note')}
        hint="A defect without a reason teaches nobody anything — this is the line that appears on the Quality report."
      >
        <Textarea
          field
          rows={3}
          placeholder="Book/Page transposed from the index"
          value={note}
          onChange={(e) => {
            setNote(e.target.value)
            alert.clear()
          }}
        />
      </Field>

      <FormActions>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn submit>Log it</Btn>
      </FormActions>
    </Form>
  )
}
