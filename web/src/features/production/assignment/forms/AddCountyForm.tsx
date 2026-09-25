import { useState } from 'react'
import { Btn } from '@/shared/ui/Button'
import { Field, Fields, Form, FormActions, FormAlert, ReadOnly } from '@/shared/ui/Form'
import { useFormAlert } from '@/shared/hooks/useFormAlert'
import { Input } from '@/shared/ui/Controls'
import { useLevels } from '@/domain/assignment/levels'
import { stateName } from '@/domain/assignment/qualification'
import { useSession } from '@/domain/auth/SessionProvider'
import { Note } from '@/shared/ui/Layout'

export function AddCountyForm({ st, onDone }: { st: string; onDone: (msg: string) => void }) {
  const { me } = useSession()
  const { addCounty, countiesIn } = useLevels(me)
  const [name, setName] = useState('')
  const alert = useFormAlert<'name'>()
  const have = countiesIn(st).length

  const submit = () => {
    const r = addCounty(st, name)
    if (!r.ok) return alert.fail(r.error, 'name')
    onDone(`${name.trim()} added to ${stateName(st)}`)
  }

  return (
    <Form onSubmit={submit}>
      <FormAlert alert={alert} bottom={12} />
      <Fields>
        <Field label="County name" error={alert.on('name')}>
          <Input
            field
            id="lc-n"
            placeholder="Allegheny"
            autoComplete="off"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              alert.clear()
            }}
          />
        </Field>
        <Field label="State" as="text">
          <ReadOnly>
            <span className="mono">
              {st} — {stateName(st)}
            </span>
          </ReadOnly>
        </Field>
      </Fields>
      <Note top={12}>
        It is added to the county list with no links on file, so it shows up under <b>Counties</b> as something to
        fill in.{' '}
        {have
          ? `${stateName(st)} currently has ${have} on file.`
          : `This would be the first county on file for ${stateName(st)}.`}
      </Note>
      <FormActions>
        <Btn submit>Add county</Btn>
      </FormActions>
    </Form>
  )
}
