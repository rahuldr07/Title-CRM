import { useState } from 'react'
import { Banner } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Chip } from '@/shared/ui/Chip'
import { Field, Fields, Form, FormActions, FormAlert } from '@/shared/ui/Form'
import { useFormAlert } from '@/shared/hooks/useFormAlert'
import { Input } from '@/shared/ui/Controls'
import { Rows } from '@/shared/ui/DetailList'
import { isDuplicateName } from '@/shared/lib/forms'
import { removePerm, savePerm, usePerms, useRoles } from '@/domain/auth/roles'
import { useSession } from '@/domain/auth/SessionProvider'
import { rewordRefusal } from '@/domain/auth/permissions'
import { Note } from '@/shared/ui/Layout'

export type PermView = { at: 'list' } | { at: 'edit'; k?: string } | { at: 'confirm'; k: string }

export function PermsManager({
  view,
  onView,
  onClose,
  onDone,
}: {
  view: PermView
  onView: (v: PermView) => void
  onClose: () => void
  onDone: (message: string) => void
}) {
  const { me } = useSession()
  const perms = usePerms()
  const roles = useRoles()
  const usage = (k: string) => roles.filter((r) => r.p.includes(k)).map((r) => r.n)

  if (view.at === 'edit') {
    return <EditPerm k={view.k} onView={onView} onDone={onDone} />
  }

  if (view.at === 'confirm') {
    const p = perms.find((x) => x.k === view.k)
    if (!p || p.sys) return null
    const held = usage(p.k)
    return (
      <>
        <Note plain size="body">
          {held.length ? (
            <>
              It is ticked on <b>{held.join(', ')}</b> and will come off{' '}
              {held.length === 1 ? 'that role' : 'those roles'}.
            </>
          ) : (
            'No role has it ticked.'
          )}
        </Note>
        <FormActions>
          <Btn variant="ghost" onClick={() => onView({ at: 'list' })}>
            Cancel
          </Btn>
          <Btn
            variant="danger"
            onClick={() => {
              const refused = removePerm(me, p.k)
              onView({ at: 'list' })
              onDone(refused ?? `“${p.n}” removed`)
            }}
          >
            Remove
          </Btn>
        </FormActions>
      </>
    )
  }

  return (
    <>
      <Note bottom={14}>
        The built-in ones are wired to real behaviour — turning one off actually stops the thing
        happening. You can reword a built-in one you hold yourself, and any of your own, and add
        your own on top. Your own are descriptive: nothing in the product checks them.
      </Note>
      <Rows>
        {perms.map((p) => {
          const held = usage(p.k)
          const locked = rewordRefusal(me, p.k)
          return (
            <div className="rw" key={p.k} style={{ gridTemplateColumns: '1fr auto' }}>
              <span>
                <b>{p.n}</b>
                {p.sys ? <Chip kind="n">Built in</Chip> : <Chip kind="b">Yours</Chip>}
                {p.never ? <Chip kind="d">Never granted</Chip> : null}
                <div className="sd">{held.length ? `Held by ${held.join(', ')}` : 'Held by nobody'}</div>
                {locked ? <div className="sd">{locked}</div> : null}
              </span>
              <span>
                <Btn variant="ghost" small disabled={!!locked} onClick={() => onView({ at: 'edit', k: p.k })}>
                  Edit
                </Btn>
              </span>
            </div>
          )
        })}
      </Rows>
      <FormActions>
        <Btn variant="ghost" onClick={onClose}>
          Close
        </Btn>
        <Btn onClick={() => onView({ at: 'edit' })}>＋ Add a permission</Btn>
      </FormActions>
    </>
  )
}

function EditPerm({
  k,
  onView,
  onDone,
}: {
  k?: string | undefined
  onView: (v: PermView) => void
  onDone: (message: string) => void
}) {
  const { me } = useSession()
  const perms = usePerms()
  const roles = useRoles()
  const p = perms.find((x) => x.k === k)
  const [n, setN] = useState(p?.n ?? '')
  const alert = useFormAlert<'wording'>()
  const held = k ? roles.filter((r) => r.p.includes(k)).map((r) => r.n) : []

  const submit = () => {
    const wording = n.trim()
    if (!wording) return alert.fail('Some wording is required.', 'wording')
    if (isDuplicateName(perms, wording, (x) => x.n, (x) => x.k === k))
      return alert.fail(`There is already a permission worded “${wording}”.`, 'wording')
    const refused = savePerm(me, wording, k)
    if (refused) return alert.fail(refused)
    onView({ at: 'list' })
    onDone(k ? `“${wording}” saved` : `“${wording}” added`)
  }

  return (
    <Form onSubmit={submit}>
      <FormAlert alert={alert} bottom={14} />

      <Fields>
        <Field
          label="Wording"
          wide
          error={alert.on('wording')}
          hint={
            p?.sys
              ? 'Renaming changes how it reads everywhere. What it controls stays the same.'
              : 'Shown on the roles matrix and in the role editor.'
          }
        >
          <Input
            field
            id="pm-n"
            placeholder="e.g. Approve a rush order"
            autoComplete="off"
            value={n}
            onChange={(e) => {
              setN(e.target.value)
              alert.clear()
            }}
          />
        </Field>
      </Fields>

      {p?.never ? (
        <Banner
          kind="r"
          icon="🔒"
          title={<span style={{ fontSize: 'var(--t-small)' }}>This one can never be granted</span>}
          margin="16px 0 0"
        >
          <span style={{ fontSize: 'var(--t-small)' }}>
            It sits on the matrix so its absence is visible rather than merely missing.
          </span>
        </Banner>
      ) : p?.sys ? (
        <Banner
          kind="b"
          icon="⚙"
          title={<span style={{ fontSize: 'var(--t-small)' }}>Built in</span>}
          margin="16px 0 0"
        >
          <span style={{ fontSize: 'var(--t-small)' }}>
            Wired to real behaviour, so it can be renamed but not deleted.{' '}
            {held.length ? `Held by ${held.join(', ')}.` : 'Held by nobody.'}
          </span>
        </Banner>
      ) : (
        <Banner
          kind="b"
          icon="◔"
          title={<span style={{ fontSize: 'var(--t-small)' }}>Your own permission</span>}
          margin="16px 0 0"
        >
          <span style={{ fontSize: 'var(--t-small)' }}>
            A permission you add is a label you can tick against roles. It records intent — it will
            not gate anything until that behaviour is built.
          </span>
        </Banner>
      )}

      <FormActions>
        <Btn variant="ghost" onClick={() => onView({ at: 'list' })}>
          Back
        </Btn>
        {k && !p?.sys ? (
          <Btn variant="danger" onClick={() => onView({ at: 'confirm', k })}>
            Remove
          </Btn>
        ) : null}
        <Btn submit>{k ? 'Save' : 'Add permission'}</Btn>
      </FormActions>
    </Form>
  )
}
