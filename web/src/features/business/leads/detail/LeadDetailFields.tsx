import { useState } from 'react'
import { LSTATUS } from '@/data/budget'
import type { Lead } from '@/data/types'
import { useStaff } from '@/domain/people/roster'
import { Field, Fields } from '@/shared/ui/Form'
import { Input, Select } from '@/shared/ui/Controls'

export interface LeadFields {
  co: string
  loc: string
  st: Lead['st']
  own: string
}
export function LeadDetailFields({
  initial,
  onChange,
}: {
  initial: LeadFields
  onChange: (d: LeadFields) => void
}) {
  const [d, setD] = useState(initial)
  const staff = useStaff()
  const upd = (patch: Partial<LeadFields>) => {
    const next = { ...d, ...patch }
    setD(next)
    onChange(next)
  }
  return (
    <Fields>
      <Field label="Company" wide>
        <Input field id="ld-c" value={d.co} onChange={(e) => upd({ co: e.target.value })} />
      </Field>
      <Field label="Location">
        <Input field id="ld-l" placeholder="City, state" value={d.loc} onChange={(e) => upd({ loc: e.target.value })} />
      </Field>
      <Field label="Status">
        <Select
          field
          id="ld-s"
          value={d.st}
          onChange={(v) => upd({ st: v })}
          options={Object.entries(LSTATUS).map(([k, v]) => [k as Lead['st'], v[0]] as const)}
        />
      </Field>
      <Field label="Owner" wide>
        <Select
          field
          id="ld-o"
          value={d.own}
          onChange={(v) => upd({ own: v })}
          options={staff.filter((s) => s.active !== false).map((s) => [s.id, s.n] as const)}
        />
      </Field>
    </Fields>
  )
}
