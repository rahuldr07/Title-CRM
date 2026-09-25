import { useState } from 'react'
import { Banner } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Field, Fields, Form, FormActions, FormAlert } from '@/shared/ui/Form'
import { useFormAlert } from '@/shared/hooks/useFormAlert'
import { Checkbox, Input } from '@/shared/ui/Controls'
import { Note } from '@/shared/ui/Layout'
import { Label } from '@/shared/ui/Card'
import { isDuplicateName } from '@/shared/lib/forms'
import { ADMIN_FLOOR, removeRole, saveRole, usePerms, useRoles } from '@/domain/auth/roles'
import { useStaff } from '@/domain/people/roster'
import { useSession } from '@/domain/auth/SessionProvider'
import { mayGrant } from '@/domain/auth/permissions'

export function RoleForm({
  id,
  onCancel,
  onDone,
  onRemove,
  onManagePerms,
  isAdmin,
}: {
  id?: string | undefined
  onCancel: () => void
  onDone: (message: string, roleId: string) => void
  onRemove: (id: string) => void
  onManagePerms: () => void
  isAdmin: boolean
}) {
  const roles = useRoles()
  const perms = usePerms()
  const staff = useStaff()
  const { me } = useSession()

  const r = roles.find((x) => x.id === id)
  const [n, setN] = useState(r?.n ?? '')
  const [desc, setDesc] = useState(r?.desc ?? '')
  const [picked, setPicked] = useState<string[]>(r?.p ?? ['own'])
  const alert = useFormAlert<'name'>()

  const held = id ? staff.filter((s) => s.r === id && s.active !== false).length : 0

  const toggle = (k: string, on: boolean) => {
    setPicked((p) => (on ? [...new Set([...p, k])] : p.filter((x) => x !== k)))
    alert.clear()
  }

  const submit = () => {
    const name = n.trim()
    if (!name) return alert.fail('A name is required.', 'name')
    if (isDuplicateName(roles, name, (x) => x.n, (x) => x.id === id))
      return alert.fail(`There is already a role called ${name}.`, 'name')
    if (!picked.length)
      return alert.fail('A role that can do nothing is not much use — pick at least one permission.')
    const saved = saveRole(me, { n: name, desc: desc.trim(), p: [...picked], lock: r?.lock }, id)
    if (saved.id === null) return alert.fail(saved.refused)
    onDone(id ? `${name} saved` : `${name} added`, saved.id)
  }

  return (
    <Form onSubmit={submit}>
      <FormAlert alert={alert} bottom={14} />

      <Fields>
        <Field label="Name" error={alert.on('name')} hint={r?.lock ? 'Call it whatever suits you. It cannot be deleted.' : undefined}>
          <Input
            field
            id="r-n"
            placeholder="e.g. Billing clerk"
            autoComplete="off"
            value={n}
            onChange={(e) => {
              setN(e.target.value)
              alert.clear()
            }}
          />
        </Field>
        <Field label="What it is for">
          <Input field id="r-d" placeholder="One line" autoComplete="off" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </Field>
      </Fields>

      <div style={{ marginTop: 18 }}>
        <Label>What this role can do</Label>
      </div>
      <div style={{ display: 'grid', gap: 7 }}>
        {perms.map((p) => {
          const on = picked.includes(p.k)
          const block = !!p.never
          const floor = id === 'admin' && ADMIN_FLOOR.includes(p.k)
          const withheld = !block && !floor && !mayGrant(me, p.k)
          return (
            <Field
              key={p.k}
              layout="wrap"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                fontSize: 'var(--t-body)',
                padding: '9px 12px',
                border: `1px solid ${block ? 'var(--flagline)' : 'var(--hair)'}`,
                borderRadius: 9,
                background: block ? 'var(--flag)' : on ? 'var(--tint)' : 'var(--card)',
                ...(block ? { opacity: 0.75 } : {}),
              }}
              label={
                <span>
                  <b>{p.n}</b>
                  {block ? (
                    <div className="sd gr" style={{ fontSize: 'var(--t-label)' }}>
                      Not available to any role, by design.
                    </div>
                  ) : floor ? (
                    <div className="sd gr" style={{ fontSize: 'var(--t-label)' }}>
                      The admin role keeps this — someone has to be able to administer.
                    </div>
                  ) : withheld ? (
                    <div className="sd gr" style={{ fontSize: 'var(--t-label)' }}>
                      Your role does not hold this, so you cannot grant it or take it away. A company admin can.
                    </div>
                  ) : p.sys ? null : (
                    <div className="sd gr" style={{ fontSize: 'var(--t-label)' }}>
                      Your own permission
                    </div>
                  )}
                </span>
              }
            >
              <Checkbox
                field
                checked={on && !block}
                disabled={block || floor || withheld}
                style={{ marginTop: 2 }}
                onChange={(e) => toggle(p.k, e.target.checked)}
              />
            </Field>
          )
        })}
      </div>

      {isAdmin ? (
        <Btn variant="ghost" small style={{ marginTop: 12 }} onClick={onManagePerms}>
          Manage permissions
        </Btn>
      ) : null}

      {r?.lock ? (
        <Banner
          kind="b"
          icon="🔒"
          title={<span style={{ fontSize: 'var(--t-small)' }}>This role’s name is fixed</span>}
          margin="16px 0 0"
        >
          <span style={{ fontSize: 'var(--t-small)' }}>
            Staff is the floor and Company admin the ceiling — every workspace needs both. You can
            still adjust what they can do, within reason.
          </span>
        </Banner>
      ) : null}

      {held ? (
        <Banner kind="r" icon="◔" margin="16px 0 0">
          <span style={{ fontSize: 'var(--t-small)' }}>
            <b>
              {held} {held === 1 ? 'person holds' : 'people hold'} this role.
            </b>{' '}
            A change applies to all of them at once.
          </span>
        </Banner>
      ) : null}

      <FormActions>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        {id && !r?.lock ? (
          <Btn variant="danger" onClick={() => onRemove(id)}>
            Remove
          </Btn>
        ) : null}
        <Btn submit>{id ? 'Save role' : 'Add role'}</Btn>
      </FormActions>
    </Form>
  )
}

export function RoleDelete({
  id,
  onCancel,
  onDone,
}: {
  id: string
  onCancel: () => void
  onDone: (message: string) => void
}) {
  const roles = useRoles()
  const staff = useStaff()
  const { me } = useSession()
  const r = roles.find((x) => x.id === id)
  if (!r || r.lock) return null
  const held = staff.filter((s) => s.r === id)

  return (
    <>
      <Note plain size="body">
        {held.length ? (
          <>
            <b>
              {held.length} {held.length === 1 ? 'person' : 'people'}
            </b>{' '}
            — {held.map((s) => s.n).join(', ')} — will drop back to <b>Staff</b>.
          </>
        ) : (
          'Nobody holds this role.'
        )}
      </Note>
      <FormActions>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn
          variant="danger"
          onClick={() => {
            onDone(removeRole(me, id) ?? `${r.n} removed`)
          }}
        >
          Remove {r.n}
        </Btn>
      </FormActions>
    </>
  )
}
