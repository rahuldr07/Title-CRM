import { useState } from 'react'
import type { LeadContact } from '@/data/types'
import { Field, Fields } from '@/shared/ui/Form'
import { Checkbox, Input } from '@/shared/ui/Controls'

const CONTACT_FIELDS: [id: string, label: string, key: 'n' | 'role' | 'e' | 'p', type: 'text' | 'email' | 'tel', placeholder: string][] = [
  ['ct-n', 'Name', 'n', 'text', ''],
  ['ct-r', 'Role', 'role', 'text', 'e.g. places the orders'],
  ['ct-e', 'Email', 'e', 'email', ''],
  ['ct-p', 'Phone', 'p', 'tel', ''],
]
export function ContactFields({
  initial,
  onChange,
}: {
  initial: LeadContact
  onChange: (d: LeadContact) => void
}) {
  const [d, setD] = useState(initial)
  const upd = (patch: Partial<LeadContact>) => {
    const next = { ...d, ...patch }
    setD(next)
    onChange(next)
  }
  return (
    <>
      <Fields>
        {CONTACT_FIELDS.map(([id, lbl, key, type, ph]) => (
          <Field key={id} label={lbl}>
            <Input
              field
              id={id}
              type={type}
              placeholder={ph}
              value={d[key]}
              onChange={(e) => upd({ [key]: e.target.value })}
            />
          </Field>
        ))}
      </Fields>
      <Field
        layout="wrap"
        style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 'var(--t-body)', marginTop: 14 }}
        label={<>{' '}Main contact for this company</>}
      >
        <Checkbox field checked={!!d.main} onChange={(e) => upd({ main: e.target.checked })} />
      </Field>
    </>
  )
}
