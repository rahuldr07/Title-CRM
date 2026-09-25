import { useStageName } from '@/domain/company/naming'
import { useState } from 'react'
import { Banner } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Field, Fields, Form, FormActions, FormAlert } from '@/shared/ui/Form'
import { useFormAlert } from '@/shared/hooks/useFormAlert'
import { Input, Select } from '@/shared/ui/Controls'
import { useLiveWork } from '@/domain/orders/liveWork'
import { isDuplicateName } from '@/shared/lib/forms'
import { removeDept, saveDept, useDepartments } from '@/domain/company/departments'
import { useStaff } from '@/domain/people/roster'
import { useSession } from '@/domain/auth/SessionProvider'
import { Note } from '@/shared/ui/Layout'

export function DeptForm({
  id,
  onCancel,
  onDone,
  onRemove,
}: {
  id?: string | undefined
  onCancel: () => void
  onDone: (message: string) => void
  onRemove: (id: string) => void
}) {
  const depts = useDepartments()
  const staff = useStaff()
  const { me } = useSession()
  const { dwork } = useLiveWork()
  const stageName = useStageName()

  const d = depts.find((x) => x.id === id)
  const [n, setN] = useState(d ? stageName(d.n) : '')
  const [desc, setDesc] = useState(d?.desc ?? '')
  const [auto, setAuto] = useState(d?.auto ?? true)
  const [pair, setPair] = useState(d?.pair ?? '')
  const alert = useFormAlert<'name'>()

  const others = depts.filter((x) => x.id !== id && !x.pair)

  const submit = () => {
    const name = n.trim()
    if (!name) return alert.fail('A name is required.', 'name')
    if (isDuplicateName(depts, name, (x) => stageName(x.n), (x) => x.id === id))
      return alert.fail(`There is already a department called ${name}.`, 'name')
    const refused = saveDept(me, { n: name, desc: desc.trim(), auto, pair: pair || null, qc: !!pair }, id)
    if (refused) return alert.fail(refused)
    onDone(id ? `${name} saved` : `${name} added`)
  }

  const people = d ? staff.filter((s) => s.dep.includes(d.n) && s.active !== false).length : 0
  const load = d ? (dwork[d.n]?.tot ?? 0) : 0

  return (
    <Form onSubmit={submit}>
      <FormAlert alert={alert} bottom={14} />

      <Fields>
        <Field label="Name" wide error={alert.on('name')}>
          <Input
            field
            id="d-n"
            placeholder="e.g. Municipal search"
            autoComplete="off"
            value={n}
            onChange={(e) => {
              setN(e.target.value)
              alert.clear()
            }}
          />
        </Field>
        <Field label="What it does" wide>
          <Input
            field
            id="d-d"
            placeholder="One line, shown on the departments list"
            autoComplete="off"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </Field>
        <Field
          label="How work reaches it"
          hint="Pipeline stages are assigned automatically. An exception branch is only used when an order needs it."
        >
          <Select
            field
            id="d-a"
            value={auto ? '1' : '0'}
            onChange={(v) => setAuto(v === '1')}
            options={[
              ['1', 'Every order, in pipeline order'],
              ['0', 'On demand — an exception branch'],
            ]}
          />
        </Field>
        <Field label="Is it a QC of another stage?" hint="A QC stage never goes to whoever did the stage it checks.">
          <Select
            field
            id="d-p"
            value={pair}
            onChange={setPair}
            options={[
              ['', 'No — it does its own work'] as const,
              ...others.map((x) => [x.n, `Yes — it checks ${stageName(x.n)}`] as const),
            ]}
          />
        </Field>
      </Fields>

      {d ? (
        <Banner kind="b" icon="◔" margin="16px 0 0">
          <span style={{ fontSize: 'var(--t-small)' }}>
            <b>{people} people</b> belong to {stageName(d.n)}
            {load ? `, carrying ${load} stage tasks today` : ''}.
          </span>
        </Banner>
      ) : (
        <Banner
          kind="r"
          icon="⚑"
          title={<span style={{ fontSize: 'var(--t-small)' }}>A new department starts with nobody in it</span>}
          margin="16px 0 0"
        >
          <span style={{ fontSize: 'var(--t-small)' }}>
            If you make it part of the pipeline, every order will need it and none of them will find
            an owner until you add staff. Those show up as exceptions, not as silent failures.
          </span>
        </Banner>
      )}

      <FormActions>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        {id ? (
          <Btn variant="danger" onClick={() => onRemove(id)}>
            Remove
          </Btn>
        ) : null}
        <Btn submit>{id ? 'Save changes' : 'Add department'}</Btn>
      </FormActions>
    </Form>
  )
}

export function DeptDelete({
  id,
  onCancel,
  onDone,
}: {
  id: string
  onCancel: () => void
  onDone: (message: string) => void
}) {
  const depts = useDepartments()
  const staff = useStaff()
  const { me } = useSession()
  const { dwork } = useLiveWork()
  const stageName = useStageName()
  const d = depts.find((x) => x.id === id)
  if (!d) return null

  const people = staff.filter((s) => s.dep.includes(d.n))
  const work = dwork[d.n]?.tot ?? 0
  const checkedBy = depts.filter((x) => x.pair === d.n).map((x) => x.n)

  return (
    <>
      <Note plain size="body">
        {people.length
          ? `${people.length} ${people.length === 1 ? 'person' : 'people'} would lose ${stageName(d.n)} from their departments.`
          : 'Nobody belongs to it.'}
        {work ? ` It is carrying ${work} stage tasks today.` : ''}
      </Note>
      {checkedBy.length ? (
        <Banner kind="d" icon="⚑" top={14}>
          <span style={{ fontSize: 'var(--t-small)' }}>
            {checkedBy.map(stageName).join(', ')} check{checkedBy.length === 1 ? 's' : ''} {stageName(d.n)}. That pairing goes
            with it, and the self-review rule stops applying to those stages.
          </span>
        </Banner>
      ) : null}
      <FormActions>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn
          variant="danger"
          onClick={() => {
            onDone(removeDept(me, id) ?? `${stageName(d.n)} removed`)
          }}
        >
          Remove {stageName(d.n)}
        </Btn>
      </FormActions>
    </>
  )
}
