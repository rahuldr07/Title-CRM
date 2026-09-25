import { useState } from 'react'
import { useGo } from '@/shared/hooks/useGo'
import { Btn, Pill } from '@/shared/ui/Button'
import { Card, Label } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { Field, Fields, Form, FormAlert } from '@/shared/ui/Form'
import { useFormAlert } from '@/shared/hooks/useFormAlert'
import { Checkbox, Input, Select, Textarea } from '@/shared/ui/Controls'
import { Inline, Note } from '@/shared/ui/Layout'
import { PageHead } from '@/shared/ui/PageHead'
import { RequireCap } from '@/shared/ui/RequireCap'
import { useUi } from '@/shared/ui/UiProvider'
import { STALE_BAD, STALE_WARN } from '@/data/business'
import { LSTATUS } from '@/data/budget'
import { whoName, useStaff } from '@/domain/people/roster'
import { useClients } from '@/domain/company/clients'
import { labelOf, money } from '@/shared/lib/format'
import { now } from '@/shared/lib/clock'
import { addLead, leadAge, useLeads } from '@/domain/leads/leads'
import { useSession } from '@/domain/auth/SessionProvider'
import type { Lead } from '@/data/types'
import { EMAIL_ERROR, isEmail } from '@/shared/lib/forms'

const NOTE_STARTERS = [
  'Cold email sent — no reply yet.',
  'Inbound enquiry through the website.',
  'Referred by an existing client.',
  'Met at a conference — asked us to follow up.',
  'Called in. Spoke briefly, sending a sample.',
]

interface Draft {
  co: string
  loc: string
  st: Lead['st']
  own: string
  cn: string
  crole: string
  ce: string
  cp: string
  note: string
  flag: boolean
}

const blank = (): Draft => ({
  co: '',
  loc: '',
  st: 'new',
  own: 'hw',
  cn: '',
  crole: '',
  ce: '',
  cp: '',
  note: '',
  flag: false,
})

function Check({ ok, warn, children }: { ok: boolean; warn?: boolean; children: string }) {
  return (
    <Inline align={false} gap={8}>
      <span className={warn ? 'warn' : ok ? 'ok' : 'gr'}>{warn ? '!' : ok ? '✓' : '○'}</span>
      <span>{children}</span>
    </Inline>
  )
}

function NewLead() {
  const clients = useClients()
  const staff = useStaff()
  const navigate = useGo()
  const { toast } = useUi()
  const { me } = useSession()
  const leads = useLeads()
  const [f, setF] = useState<Draft>(blank)
  const alert = useFormAlert<'co' | 'contact' | 'email' | 'note'>()

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setF((d) => ({ ...d, [k]: v }))
    alert.clear()
  }

  const q = f.co.trim().toLowerCase()
  const dupeClient = q
    ? clients.find((c) => c.n.toLowerCase().includes(q) || q.includes(c.n.toLowerCase()))
    : undefined
  const dupeLead = q
    ? leads.find((l) => l.co.toLowerCase().includes(q) || q.includes(l.co.toLowerCase()))
    : undefined
  const mail = f.ce.trim().toLowerCase()
  const dupeMail = mail
    ? leads.find((l) => l.contacts.some((c) => (c.e || '').toLowerCase() === mail))
    : undefined

  const create = () => {
    if (!f.co.trim()) return alert.fail('A company name is required.', 'co')
    if (!f.cn.trim() && !f.ce.trim())
      return alert.fail('Give at least a name or an email — otherwise there is nobody to contact.', 'contact')
    if (f.ce.trim() && !isEmail(f.ce)) return alert.fail(EMAIL_ERROR, 'email')
    if (!f.note.trim())
      return alert.fail('Write a first note — it is what the follow-up clock runs from.', 'note')

    const saved = addLead(me, {
      co: f.co.trim(),
      loc: f.loc.trim() || '—',
      st: f.st,
      own: f.own,
      flag: f.flag,
      contacts: [
        {
          n: f.cn.trim() || '—',
          role: f.crole.trim() || 'Contact',
          e: f.ce.trim(),
          p: f.cp.trim(),
          main: true,
        },
      ],
      notes: [{ w: f.own, at: now(), t: f.note.trim() }],
    })
    if (saved.id === null) return alert.fail(saved.refused)
    toast(`${f.co.trim()} added`)
    navigate({ to: '/leads/$leadId', params: { leadId: saved.id } })
  }

  return (
    <>
      <PageHead
        parent={{ to: '/leads', label: 'Leads' }}
        title="Add a lead"
        sub="A company, someone to call, and what you already know. The note starts the follow-up clock."
      />

      <FormAlert alert={alert} />

      {dupeClient ? (
        <div className="bnr d">
          <span className="bi">⚑</span>
          <div>
            <div className="bt">{dupeClient.n} is already a client</div>
            {dupeClient.orders.toLocaleString()} orders, {money(dupeClient.total)} invoiced. Worth
            checking before anyone cold-calls them.
          </div>
          <div className="ba">
            <Btn
              variant="ghost"
              small
              onClick={() =>
                navigate({ to: '/clients/$clientCode', params: { clientCode: dupeClient.n } })
              }
            >
              Open the client
            </Btn>
          </div>
        </div>
      ) : dupeLead ? (
        <div className="bnr r">
          <span className="bi">⚑</span>
          <div>
            <div className="bt">{dupeLead.co} is already on the leads list</div>
            <Chip kind={labelOf(LSTATUS, dupeLead.st)[1]}>{labelOf(LSTATUS, dupeLead.st)[0]}</Chip> · owned by{' '}
            {whoName(dupeLead.own)} · last contact {leadAge(dupeLead)} days ago.
          </div>
          <div className="ba">
            <Btn
              variant="ghost"
              small
              onClick={() => navigate({ to: '/leads/$leadId', params: { leadId: dupeLead.id } })}
            >
              Open it
            </Btn>
          </div>
        </div>
      ) : null}

      {dupeMail && dupeMail !== dupeLead ? (
        <div className="bnr r">
          <span className="bi">✉</span>
          <div>
            <div className="bt">That email is already on {dupeMail.co}</div>
            The same person may work at both, or this is a duplicate.
          </div>
          <div className="ba">
            <Btn
              variant="ghost"
              small
              onClick={() => navigate({ to: '/leads/$leadId', params: { leadId: dupeMail.id } })}
            >
              Open it
            </Btn>
          </div>
        </div>
      ) : null}

      <Form className="two" onSubmit={create}>
        <div>
          <Card padded>
            <Label>Company</Label>
            <Fields>
              <Field label="Name" wide error={alert.on('co')}>
                <Input
                  field
                  id="nl-co"
                  value={f.co}
                  placeholder="e.g. Ridgeline Title Services"
                  onChange={(e) => set('co', e.target.value)}
                />
              </Field>
              <Field label="Location">
                <Input
                  field
                  id="nl-loc"
                  value={f.loc}
                  placeholder="City, state"
                  onChange={(e) => set('loc', e.target.value)}
                />
              </Field>
              <Field label="Status">
                <Select
                  field
                  id="nl-st"
                  value={f.st}
                  onChange={(v) => set('st', v)}
                  options={Object.entries(LSTATUS)
                    .filter(([k]) => !['won', 'lost'].includes(k))
                    .map(([k, v]) => [k as Lead['st'], v[0]] as const)}
                />
              </Field>
            </Fields>
          </Card>

          <Card padded top={16}>
            <Label>Someone to contact</Label>
            <Fields>
              <Field label="Name" error={alert.on('contact')}>
                <Input field id="nl-cn" value={f.cn} onChange={(e) => set('cn', e.target.value)} />
              </Field>
              <Field label="Role">
                <Input
                  field
                  id="nl-cr"
                  value={f.crole}
                  placeholder="e.g. places the orders"
                  onChange={(e) => set('crole', e.target.value)}
                />
              </Field>
              <Field label="Email" error={alert.on('email') ?? alert.on('contact')}>
                <Input field id="nl-ce" type="email" value={f.ce} onChange={(e) => set('ce', e.target.value)} />
              </Field>
              <Field label="Phone">
                <Input field id="nl-cp" type="tel" value={f.cp} onChange={(e) => set('cp', e.target.value)} />
              </Field>
            </Fields>
            <Note top={10}>
              One is enough to start. You can add the rest — the orders desk, whoever signs — once you
              know who they are.
            </Note>
          </Card>

          <Card padded top={16}>
            <Label>What you know so far</Label>
            <Textarea
              label="What you know so far"
              id="nl-note"
              aria-invalid={!!alert.on('note')}
              aria-describedby={alert.on('note')}
              value={f.note}
              placeholder="How you came across them, what was said, what you promised"
              onChange={(e) => set('note', e.target.value)}
            />
            <Inline align={false} wrap gap={7} style={{ marginTop: 10 }}>
              {NOTE_STARTERS.map((s) => (
                <Pill key={s} style={{ border: '1px solid var(--hair)' }} onClick={() => set('note', s)}>
                  {(s.split(/[—.]/)[0] ?? s).trim()}
                </Pill>
              ))}
            </Inline>
            <Note top={10}>
              This becomes the first note. The follow-up clock runs from it, so a lead with nothing
              recorded is a lead nobody will chase.
            </Note>
          </Card>
        </div>

        <aside>
          <Card padded style={{ position: 'sticky', top: 76 }}>
            <Label>Owner</Label>
            <Select
              label="Lead owner"
              id="nl-own"
              value={f.own}
              onChange={(v) => set('own', v)}
              options={staff.filter((s) => s.active !== false).map((s) => [s.id, s.n] as const)}
            />
            <Note size="label" top={7}>
              Whoever will actually chase it.
            </Note>

            <div className="lb" style={{ marginTop: 20 }}>
              Follow-up
            </div>
            <Field
              layout="wrap"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 9,
                fontSize: 'var(--t-small)',
                padding: '10px 12px',
                border: '1px solid var(--hair)',
                borderRadius: 9,
                background: f.flag ? 'var(--flag)' : 'var(--tint)',
              }}
              label={
                <span>
                  <b>Flag it now</b>
                  <div className="sd gr" style={{ fontSize: 'var(--t-label)' }}>
                    Surfaces it immediately rather than waiting for it to go quiet.
                  </div>
                </span>
              }
            >
              <Checkbox field checked={f.flag} onChange={(e) => set('flag', e.target.checked)} style={{ marginTop: 2 }} />
            </Field>
            <Note size="label" top={9}>
              Otherwise it turns amber on its own after {STALE_WARN} days with no note, red after{' '}
              {STALE_BAD}. Nothing to schedule.
            </Note>

            <div className="lb" style={{ marginTop: 20 }}>
              Check
            </div>
            <div style={{ display: 'grid', gap: 6, fontSize: 'var(--t-small)' }}>
              <Check ok={!!f.co.trim()}>Company named</Check>
              <Check ok={!!(f.cn.trim() || f.ce.trim())}>Someone to reach</Check>
              <Check ok={!!f.note.trim()}>First note written</Check>
              <Check ok={!dupeClient && !dupeLead} warn={!!(dupeClient || dupeLead)}>
                {dupeClient ? 'Already a client' : dupeLead ? 'Already a lead' : 'Not a duplicate'}
              </Check>
            </div>

            <Btn submit style={{ width: '100%', marginTop: 18 }}>
              Add lead
            </Btn>
            <Btn
              variant="ghost"
              style={{ width: '100%', marginTop: 8 }}
              onClick={() => navigate({ to: '/leads' })}
            >
              Cancel
            </Btn>
          </Card>
        </aside>
      </Form>
    </>
  )
}

export default function NewLeadRoute() {
  return (
    <RequireCap cap="pricing">
      <NewLead />
    </RequireCap>
  )
}
