import { useState } from 'react'
import { Btn } from '@/shared/ui/Button'
import { Field, Form, FormActions, FormAlert } from '@/shared/ui/Form'
import { useFormAlert } from '@/shared/hooks/useFormAlert'
import { Input } from '@/shared/ui/Controls'
import { addPrefix, clashOf } from './prefixes'
import type { Client } from '@/data/types'
import { useSession } from '@/domain/auth/SessionProvider'

export function PrefixForm({
  client,
  onCancel,
  onDone,
}: {
  client: Client
  onCancel: () => void
  onDone: (message: string) => void
}) {
  const { me } = useSession()
  const [value, setValue] = useState(client.dn)
  const alert = useFormAlert<'prefix'>()

  const submit = () => {
    const v = value.trim()
    if (!v) return alert.fail('A prefix cannot be empty.', 'prefix')

    const clash = clashOf(v)
    if (clash) {
      const [who, existing] = clash
      if (existing === v) {
        return alert.fail(
          who === client.n
            ? `${client.n} already claims ${v}.`
            : `${v} already belongs to ${who}. One prefix cannot resolve to two clients.`,
          'prefix',
        )
      }
      return alert.fail(
        who === client.n
          ? `${v} overlaps ${existing}, which ${client.n} already claims. An order number matching one matches the other, so only one of them can decide where the mail goes.`
          : `${v} overlaps ${existing}, already used by ${who}. Overlapping prefixes route mail to whichever matches first, which is not a decision anyone made.`,
        'prefix',
      )
    }

    const refused = addPrefix(me, client.n, v)
    if (refused) return alert.fail(refused)
    onDone(`${v} added — mail carrying it now resolves to ${client.n}`)
  }

  return (
    <Form onSubmit={submit}>
      <FormAlert alert={alert} margin="0 0 14px" />

      <Field
        label="Prefix"
        error={alert.on('prefix')}
        hint={`Any incoming order number starting with this resolves to ${client.n}. Keep them distinct — an ambiguous prefix routes mail to the wrong client silently.`}
      >
        <Input
          field
          mono
          placeholder={`${client.dn}OH-`}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            alert.clear()
          }}
        />
      </Field>

      <FormActions>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn submit>Add</Btn>
      </FormActions>
    </Form>
  )
}
