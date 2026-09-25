import { useStageName } from '@/domain/company/naming'
import { useState } from 'react'
import { Btn } from '@/shared/ui/Button'
import { Field, Fields, Form, FormActions, FormAlert, ReadOnly } from '@/shared/ui/Form'
import { useFormAlert } from '@/shared/hooks/useFormAlert'
import { Input, Select, Textarea } from '@/shared/ui/Controls'
import { openingProblem, type OpeningDraft, type OpeningField } from '@/features/hrms/recruitment/hiring'
import { now } from '@/shared/lib/clock'
import { fmtDate } from '@/shared/lib/format'
import { useDepartments } from '@/domain/company/departments'
import { useStaff } from '@/domain/people/roster'
import { Note } from '@/shared/ui/Layout'

const TYPES = ['Full time', 'Part time', 'Contract', 'Intern'] as const

export function OpeningForm({
  raisedBy,
  onSubmit,
  onCancel,
}: {
  raisedBy: string
  onSubmit: (draft: OpeningDraft) => void
  onCancel?: () => void
}) {
  const depts = useDepartments()
  const staff = useStaff()
  const stageName = useStageName()
  const [title, setTitle] = useState('')
  const [dep, setDep] = useState(depts[0]?.n ?? '')
  const [seats, setSeats] = useState('1')
  const [type, setType] = useState<string>(TYPES[0])
  const [why, setWhy] = useState('')
  const alert = useFormAlert<OpeningField>()

  const n = Number(seats)
  const inDept = staff.filter((s) => s.dep.includes(dep) && s.active !== false).length

  const submit = () => {
    const draft = { title, dep, n, type, by: raisedBy, why }
    const problem = openingProblem(draft)
    if (problem) return alert.fail(problem.message, problem.field)
    onSubmit(draft)
  }

  return (
    <Form onSubmit={submit}>
      <FormAlert alert={alert} title="Not opened" bottom={14} />
      <Fields>
        <Field label="Title" wide error={alert.on('title')} hint="What a candidate sees, so name the work and the states it covers.">
          <Input
            field
            id="no-title"
            placeholder="Title searcher — PA and NJ"
            autoComplete="off"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              alert.clear()
            }}
          />
        </Field>

        <Field
          label="Department"
          hint={
            <>
              {inDept} {inDept === 1 ? 'person works' : 'people work'} {stageName(dep)} today.
            </>
          }
        >
          <Select field id="no-dep" value={dep} onChange={setDep} options={depts.map((d) => [d.n, stageName(d.n)] as const)} />
        </Field>

        <Field
          label="Seats"
          error={alert.on('seats')}
          hint={
            n >= 1 && Number.isInteger(n)
              ? `${stageName(dep)} would go from ${inDept} to ${inDept + n}.`
              : 'How many people this opening is for.'
          }
        >
          <Input
            field
            mono
            id="no-seats"
            type="number"
            min={1}
            max={50}
            value={seats}
            onChange={(e) => {
              setSeats(e.target.value)
              alert.clear()
            }}
          />
        </Field>

        <Field label="Employment">
          <Select field id="no-type" value={type} onChange={setType} options={TYPES.map((t) => [t, t] as const)} />
        </Field>

        <Field label="Raised by" as="text">
          <ReadOnly>{raisedBy}</ReadOnly>
        </Field>
      </Fields>

      <Field
        label="Why this opening exists"
        error={alert.on('why')}
        style={{ marginTop: 15 }}
        hint="The case for the headcount. It stays on the opening, so the reason is still there when the approval is looked at again."
      >
        <Textarea
          field
          id="no-why"
          placeholder="Volume from MGR has grown faster than Search can absorb; this is the department the reports keep flagging."
          value={why}
          onChange={(e) => {
            setWhy(e.target.value)
            alert.clear()
          }}
        />
      </Field>

      <FormActions>
        {onCancel ? (
          <Btn variant="ghost" onClick={onCancel}>
            Cancel
          </Btn>
        ) : null}
        <Btn submit>Open the role</Btn>
      </FormActions>

      <Note size="label" top={12}>
        Opens {fmtDate(now())} under {raisedBy}, with no candidates against it yet.
      </Note>
    </Form>
  )
}
