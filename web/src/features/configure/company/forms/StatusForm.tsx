import { useState } from 'react'
import { Btn } from '@/shared/ui/Button'
import { Field, Form, FormActions, FormAlert } from '@/shared/ui/Form'
import { useFormAlert } from '@/shared/hooks/useFormAlert'
import { Input } from '@/shared/ui/Controls'
import { isDuplicateName } from '@/shared/lib/forms'
import { removeStatus, saveStatus, useStatuses } from '@/domain/company/statuses'
import { useSession } from '@/domain/auth/SessionProvider'
import { Note } from '@/shared/ui/Layout'

export function StatusForm({
  statusKey,
  onCancel,
  onDone,
}: {
  statusKey?: string | undefined
  onCancel: () => void
  onDone: (message: string) => void
}) {
  const { me } = useSession()
  const statuses = useStatuses()
  const cur = statusKey ? statuses.find(([k]) => k === statusKey)?.[1] : null
  const [name, setName] = useState(cur?.[0] ?? '')
  const [colour, setColour] = useState(cur?.[1] ?? '#6366F1')
  const alert = useFormAlert<'name'>()

  const submit = () => {
    const n = name.trim()
    if (!n) return alert.fail('A status needs a name.', 'name')
    if (isDuplicateName(statuses, n, ([, v]) => v[0], ([k]) => k === statusKey))
      return alert.fail(
        `${n} already exists. Two statuses with the same name is how an order ends up in neither.`,
        'name',
      )
    const refused = saveStatus(me, n, colour, statusKey)
    if (refused) return alert.fail(refused)
    onDone(statusKey ? `${n} saved` : `${n} added`)
  }

  return (
    <Form onSubmit={submit}>
      <FormAlert alert={alert} bottom={14} />

      <Field label="Name" error={alert.on('name')}>
        <Input
          field
          id="stName"
          placeholder="e.g. Awaiting county"
          autoComplete="off"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            alert.clear()
          }}
        />
      </Field>

      <Field
        label="Colour"
        hint="Used on the board and in every status chip. Colour is never the only signal — the name is always shown beside it."
      >
        <Input
          field
          id="stCol"
          type="color"
          style={{ width: 90, padding: 4 }}
          value={colour}
          onChange={(e) => setColour(e.target.value)}
        />
      </Field>

      <FormActions>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn submit>{statusKey ? 'Save' : 'Add status'}</Btn>
      </FormActions>
    </Form>
  )
}

export function StatusDelete({
  statusKey,
  name,
  used,
  onCancel,
  onSee,
  onDone,
}: {
  statusKey: string
  name: string
  used: number
  onCancel: () => void
  onSee: () => void
  onDone: (message: string) => void
}) {
  const { me } = useSession()
  if (used) {
    return (
      <>
        <Note plain size="body">
          <b>
            {used} order{used === 1 ? ' is' : 's are'}
          </b>{' '}
          sitting in {name} right now.
        </Note>
        <Note>
          Deleting it would leave {used === 1 ? 'that order' : 'those orders'} pointing at nothing.
          Move {used === 1 ? 'it' : 'them'} first, then delete the status.
        </Note>
        <FormActions>
          <Btn variant="ghost" onClick={onCancel}>
            Close
          </Btn>
          <Btn onClick={onSee}>See {used === 1 ? 'it' : 'them'}</Btn>
        </FormActions>
      </>
    )
  }

  return (
    <>
      <Note plain size="body">Nothing is using it, so nothing breaks.</Note>
      <FormActions>
        <Btn variant="ghost" onClick={onCancel}>
          Keep it
        </Btn>
        <Btn
          variant="danger"
          onClick={() => {
            onDone(removeStatus(me, statusKey) ?? `${name} deleted`)
          }}
        >
          Delete
        </Btn>
      </FormActions>
    </>
  )
}
