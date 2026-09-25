import { useState } from 'react'
import { Banner } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Field, Form, FormActions, FormAlert } from '@/shared/ui/Form'
import { useFormAlert } from '@/shared/hooks/useFormAlert'
import { Select, Textarea } from '@/shared/ui/Controls'
import { UPDKIND } from '@/data/production'
import type { Update } from '@/data/types'

const KINDS = Object.keys(UPDKIND) as Update['kind'][]

const MIN_BODY = 12

export function UpdateForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void
  onSubmit: (kind: Update['kind'], body: string) => void
}) {
  const [kind, setKind] = useState<Update['kind']>(KINDS[0] ?? 'Note')
  const [body, setBody] = useState('')
  const alert = useFormAlert<'body'>()

  const submit = () => {
    const b = body.trim()
    if (b.length < MIN_BODY) {
      return alert.fail(
        'Write enough to be useful to someone who was not here. A few words is a note to yourself, not a handover.',
        'body',
      )
    }
    onSubmit(kind, b)
  }

  return (
    <Form onSubmit={submit}>
      <Field
        label="What kind"
        hint="Handover and Blocked are the two anyone else actually reads."
      >
        <Select field value={kind} onChange={setKind} options={KINDS.map((k) => [k, k] as const)} />
      </Field>

      <Field label="What happened" error={alert.on('body')}>
        <Textarea
          field
          rows={4}
          placeholder="Enough that someone picking this up tomorrow does not have to ask you"
          value={body}
          onChange={(e) => {
            setBody(e.target.value)
            alert.clear()
          }}
        />
      </Field>

      <Banner kind="b" icon="⚑" top={10}>
        Once posted this cannot be edited or removed. An update you can quietly change afterwards is
        not a record of anything.
      </Banner>

      <FormAlert alert={alert} margin="10px 0 0" />

      <FormActions>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn submit>Post it</Btn>
      </FormActions>
    </Form>
  )
}
