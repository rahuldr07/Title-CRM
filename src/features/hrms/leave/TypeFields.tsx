import { useState } from 'react'
import type { LeaveType } from '@/data/types'
import { Field, Fields } from '@/shared/ui/Form'
import { Checkbox, Input } from '@/shared/ui/Controls'

export function TypeFields({
  initial,
  onChange,
}: {
  initial: LeaveType
  onChange: (d: LeaveType) => void
}) {
  const [d, setD] = useState(initial)
  const upd = (patch: Partial<LeaveType>) => {
    const next = { ...d, ...patch }
    setD(next)
    onChange(next)
  }
  return (
    <>
      <Fields>
        <Field label="Name" wide>
          <Input field id="lt-n" value={d.n} onChange={(e) => upd({ n: e.target.value })} />
        </Field>
        <Field label="Days a year" hint="Zero means it is earned rather than granted, like comp-off.">
          <Input
            field
            mono
            id="lt-a"
            type="number"
            min={0}
            value={d.annual}
            onChange={(e) => upd({ annual: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Carries over">
          <Input
            field
            mono
            id="lt-c"
            type="number"
            min={0}
            value={d.carry}
            onChange={(e) => upd({ carry: Number(e.target.value) || 0 })}
          />
        </Field>
      </Fields>
      <Field label="How it behaves">
        <Input
          field
          id="lt-d"
          value={d.d}
          placeholder="What somebody reading the balance needs to know"
          onChange={(e) => upd({ d: e.target.value })}
        />
      </Field>
      <Field
        layout="wrap"
        style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 'var(--t-body)', marginTop: 12 }}
        label={<>{' '}Encashable when somebody leaves</>}
      >
        <Checkbox field checked={!!d.enc} onChange={(e) => upd({ enc: e.target.checked })} />
      </Field>
    </>
  )
}
