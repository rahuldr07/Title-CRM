import { useState } from 'react'
import { Banner } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Field, Fields, Form, FormActions, FormAlert } from '@/shared/ui/Form'
import { useFormAlert } from '@/shared/hooks/useFormAlert'
import { Input, Select } from '@/shared/ui/Controls'
import { Note } from '@/shared/ui/Layout'
import { money } from '@/shared/lib/format'
import { removeClient, saveClient, useClients } from '@/domain/company/clients'
import type { Client } from '@/data/types'
import { EMAIL_ERROR, isDuplicateName, isEmail } from '@/shared/lib/forms'
import { useSession } from '@/domain/auth/SessionProvider'

const TERMS = ['Net 15', 'Net 30', 'Net 45', 'Per order', 'Prepaid']
export function ClientForm({
  name,
  onCancel,
  onDone,
  onRemove,
}: {
  name?: string | undefined
  onCancel: () => void
  onDone: (message: string) => void
  onRemove: (name: string) => void
}) {
  const { me } = useSession()
  const clients = useClients()
  const c = clients.find((x) => x.n === name)

  const [n, setN] = useState(c?.n ?? '')
  const [dn, setDn] = useState(c?.dn ?? '')
  const [email, setEmail] = useState(c?.e ?? '')
  const [phone, setPhone] = useState(c?.p ?? '')
  const [terms, setTerms] = useState(c?.terms ?? 'Net 30')
  const [active, setActive] = useState(c?.active !== false)
  const alert = useFormAlert<'name' | 'code' | 'email'>()

  const submit = () => {
    const client = c ? c.n : n.trim()
    const code = dn.trim().toUpperCase()
    if (!client) return alert.fail('A client name is required.', 'name')
    if (!code) return alert.fail('A short code is required — it is what appears on orders.', 'code')
    if (!/^[A-Z0-9]{2,6}$/.test(code))
      return alert.fail('The code should be 2–6 letters or numbers, no spaces.', 'code')
    if (isDuplicateName(clients, client, (x) => x.n, (x) => x.n === name))
      return alert.fail(`There is already a client called ${client}.`, 'name')
    const clash = clients.find((x) => x.n !== name && x.dn === code)
    if (clash) return alert.fail(`${code} is already used by ${clash.n}.`, 'code')
    if (email && !isEmail(email)) return alert.fail(EMAIL_ERROR, 'email')

    const next: Client = {
      ...(c ?? { orders: 0, inv: 0, total: 0, paid: 0 }),
      n: client,
      dn: code,
      e: email.trim(),
      p: phone.trim(),
      terms,
      active,
    }
    const refused = saveClient(me, next, name)
    if (refused) return alert.fail(refused)
    onDone(name ? `${client} saved` : `${client} added`)
  }

  const change =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v)
      alert.clear()
    }

  return (
    <Form onSubmit={submit}>
      <FormAlert alert={alert} bottom={14} />

      <Fields>
        <Field
          label="Client name"
          error={alert.on('name')}
          hint={c ? 'Fixed once the client exists — invoices, turnaround promises and order prefixes are filed under it.' : undefined}
        >
          <Input
            field
            id="c-n"
            placeholder="e.g. Ridgeline Title"
            autoComplete="off"
            value={n}
            readOnly={!!c}
            onChange={(e) => change(setN)(e.target.value)}
          />
        </Field>
        <Field label="Code on orders" error={alert.on('code')} hint="Short code shown instead of the full name on internal screens and order numbers.">
          <Input
            field
            mono
            id="c-dn"
            maxLength={6}
            placeholder="RDG"
            autoComplete="off"
            value={dn}
            onChange={(e) => change(setDn)(e.target.value)}
          />
        </Field>
        <Field label="Email" error={alert.on('email')}>
          <Input
            field
            id="c-e"
            type="email"
            placeholder="orders@client.com"
            autoComplete="off"
            value={email}
            onChange={(e) => change(setEmail)(e.target.value)}
          />
        </Field>
        <Field label="Phone">
          <Input field id="c-p" type="tel" autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Payment terms">
          <Select field id="c-t" value={terms} onChange={setTerms} options={TERMS.map((t) => [t, t] as const)} />
        </Field>
        <Field label="Status">
          <Select
            field
            id="c-a"
            value={active ? '1' : '0'}
            onChange={(v) => setActive(v === '1')}
            options={[
              ['1', 'Active'],
              ['0', 'Inactive — no new orders'],
            ]}
          />
        </Field>
      </Fields>

      {c ? (
        <Banner kind="b" icon="◔" margin="16px 0 0">
          <span style={{ fontSize: 'var(--t-small)' }}>
            <b>{c.orders.toLocaleString()} orders</b> and <b>{money(c.total)}</b> invoiced to date.
            Changing the code does not rewrite past order numbers.
          </span>
        </Banner>
      ) : (
        <Banner
          kind="b"
          icon="◷"
          title={<span style={{ fontSize: 'var(--t-small)' }}>Set their turnaround next</span>}
          margin="16px 0 0"
        >
          <span style={{ fontSize: 'var(--t-small)' }}>
            A new client falls back to the 24h default until you give them their own SLA.
          </span>
        </Banner>
      )}

      <FormActions>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        {name ? (
          <Btn variant="danger" onClick={() => onRemove(name)}>
            Remove
          </Btn>
        ) : null}
        <Btn submit>{name ? 'Save changes' : 'Add client'}</Btn>
      </FormActions>
    </Form>
  )
}

export function ClientDelete({
  name,
  onCancel,
  onDone,
}: {
  name: string
  onCancel: () => void
  onDone: (message: string) => void
}) {
  const { me } = useSession()
  const clients = useClients()
  const c = clients.find((x) => x.n === name)
  if (!c) return null

  return (
    <>
      <Note plain size="body">
        {c.orders ? (
          <>
            They have <b>{c.orders.toLocaleString()} orders</b> and <b>{money(c.total)}</b> invoiced.
            Removing them takes that history with them.
          </>
        ) : (
          'They have no orders or invoices.'
        )}
      </Note>
      <Banner kind="r" icon="⚑" top={14}>
        <span style={{ fontSize: 'var(--t-small)' }}>
          Marking them inactive stops new orders without losing anything. Removing is only right
          when the record should never have existed.
        </span>
      </Banner>
      <FormActions>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn
          variant="danger"
          onClick={() => {
            onDone(removeClient(me, name) ?? `${name} removed`)
          }}
        >
          Remove {name}
        </Btn>
      </FormActions>
    </>
  )
}
