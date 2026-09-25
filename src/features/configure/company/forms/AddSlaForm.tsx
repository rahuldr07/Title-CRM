import { useState } from 'react'
import { Btn } from '@/shared/ui/Button'
import { Field, Fields, Form, FormActions, FormAlert } from '@/shared/ui/Form'
import { useFormAlert } from '@/shared/hooks/useFormAlert'
import { Input, Select } from '@/shared/ui/Controls'
import { PRODUCTS } from '@/data/catalog'
import { addSla, useSla } from '@/domain/assignment/turnaround'
import { useClients } from '@/domain/company/clients'
import { useSession } from '@/domain/auth/SessionProvider'

export function AddSlaForm({ onCancel, onDone }: { onCancel: () => void; onDone: (m: string) => void }) {
  const { me } = useSession()
  const sla = useSla()
  const clients = useClients()
  const [cl, setCl] = useState(clients[0]?.n ?? '')
  const [pr, setPr] = useState('Any')
  const [h, setH] = useState('24')
  const alert = useFormAlert<'hours' | 'pair'>()

  const submit = () => {
    const hours = parseInt(h, 10)
    if (!(hours > 0) || hours > 336) return alert.fail('A turnaround between 1 and 336 hours.', 'hours')
    if (sla.some((x) => x.cl === cl && x.pr === pr))
      return alert.fail(
        `${cl} · ${pr} already has a rule. Edit its hours in the table instead of adding a second one — two rules for the same pair is how a due date becomes unpredictable.`,
        'pair',
      )
    const refused = addSla(me, { cl, pr, h: hours })
    if (refused) return alert.fail(refused)
    onDone(`${cl} · ${pr} — ${hours}h`)
  }

  return (
    <Form onSubmit={submit}>
      <FormAlert alert={alert} bottom={14} />
      <Fields>
        <Field label="Client" error={alert.on('pair')}>
          <Select
            field
            id="sla-cl"
            value={cl}
            onChange={(v) => {
              setCl(v)
              alert.clear()
            }}
            options={clients.map((c) => [c.n, c.n] as const)}
          />
        </Field>
        <Field label="Product" error={alert.on('pair')}>
          <Select
            field
            id="sla-pr"
            value={pr}
            onChange={(v) => {
              setPr(v)
              alert.clear()
            }}
            options={[
              ['Any', 'Any product — covers everything for this client'] as const,
              ...PRODUCTS.map((p) => [p.id, `${p.id} — ${p.n}`] as const),
            ]}
          />
        </Field>
        <Field label="Turnaround" error={alert.on('hours')} hint="A client × product rule beats a client × Any rule, which beats the fallback.">
          <Input
            field
            mono
            id="sla-h"
            type="number"
            min={1}
            max={336}
            style={{ width: 90 }}
            value={h}
            onChange={(e) => {
              setH(e.target.value)
              alert.clear()
            }}
          />
        </Field>
      </Fields>
      <FormActions>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn submit>Add rule</Btn>
      </FormActions>
    </Form>
  )
}
