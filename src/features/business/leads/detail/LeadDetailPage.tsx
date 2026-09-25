import { useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { useGo } from '@/shared/hooks/useGo'
import { Btn } from '@/shared/ui/Button'
import { Card, CardBody, Label } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { KeyValues, Rows } from '@/shared/ui/DetailList'
import { NotFoundRecord } from '@/shared/ui/NotFoundRecord'
import { PageHead } from '@/shared/ui/PageHead'
import { RequireCap } from '@/shared/ui/RequireCap'
import { useSession } from '@/domain/auth/SessionProvider'
import { useUi } from '@/shared/ui/UiProvider'
import { LSTATUS } from '@/data/budget'
import { whoName } from '@/domain/people/roster'
import { daysSince, fmtDate, initials, labelOf } from '@/shared/lib/format'
import { now } from '@/shared/lib/clock'
import { isStale, lastTouch, leadAge, leadById, updateLead, useLeads } from '@/domain/leads/leads'
import type { Lead, LeadContact } from '@/data/types'
import { Field, Form } from '@/shared/ui/Form'
import { Checkbox, Select, Textarea } from '@/shared/ui/Controls'
import { Inline, Note } from '@/shared/ui/Layout'
import { ContactFields } from './ContactFields'
import { LeadBanner } from './LeadBanner'
import { LeadContacts } from './LeadContacts'
import { LeadDetailFields, type LeadFields } from './LeadDetailFields'
import { firstContact as firstOf, newestFirst } from './leadDetail'

const blankContact = (): LeadContact => ({ n: '', role: '', e: '', p: '' })

function LeadDetail() {
  const { leadId } = useParams({ from: '/leads/$leadId' })
  const navigate = useGo()
  const { me } = useSession()
  const { toast, openModal, closeModal } = useUi()

  const leads = useLeads()
  const [draft, setDraft] = useState('')

  const edit = (fn: (l: Lead) => Lead): boolean => {
    const refused = updateLead(me, leadId, fn)
    if (refused) toast(refused)
    return !refused
  }

  const lead = leadById(leadId, leads)
  if (!lead) return <NotFoundRecord what="lead" backTo="/leads" backLabel="Leads" />

  const age = leadAge(lead)
  const stale = isStale(lead)
  const notes = newestFirst(lead.notes)
  const [label, kind] = labelOf(LSTATUS, lead.st)

  const setStatus = (v: Lead['st']) => {
    if (edit((l) => ({ ...l, st: v, flag: v === 'won' || v === 'lost' ? false : !!l.flag })))
      toast(`${lead.co} — ${labelOf(LSTATUS, v)[0]}`)
  }

  const toggleFlag = () => {
    const on = !lead.flag
    if (edit((l) => ({ ...l, flag: on }))) toast(on ? 'Flagged for follow-up' : 'Flag cleared')
  }

  const addNote = () => {
    const t = draft.trim()
    if (!t) {
      toast('A note needs something in it')
      return
    }
    if (!edit((l) => ({ ...l, notes: [...l.notes, { w: me.id, at: now(), t }] }))) return
    setDraft('')
    toast('Note added — the quiet clock resets')
  }

  const copyDetails = () =>
    openModal({
      title: 'Details to carry over',
      body: (
        <>
          <Note bottom={14}>
            Create the client record under Clients, then paste these in.
          </Note>
          <Card padded style={{ fontFamily: 'var(--mono)', fontSize: 'var(--t-label)', lineHeight: 1.9 }}>
            <div>Company&nbsp;&nbsp; {lead.co}</div>
            <div>Location&nbsp; {lead.loc}</div>
            {lead.contacts.map((c) => (
              <div key={`${c.n}-${c.e}`}>
                Contact&nbsp;&nbsp; {c.n} — {c.role} — {c.e}
                {c.p ? ` — ${c.p}` : ''}
              </div>
            ))}
            <div>Notes&nbsp;&nbsp;&nbsp;&nbsp; {lead.notes.length} on the lead record</div>
          </Card>
        </>
      ),
      footer: (
        <>
          <Btn variant="ghost" onClick={closeModal}>
            Close
          </Btn>
          <Btn
            onClick={() => {
              closeModal()
              navigate({ to: '/company' })
            }}
          >
            Go to clients
          </Btn>
        </>
      ),
    })

  const editContact = (index: number) => {
    const existing = index >= 0 ? lead.contacts[index] : undefined
    const initial = existing ? { ...existing } : blankContact()
    const held = { ...initial }
    const save = () => {
      if (!held.n.trim() && !held.e.trim()) {
        toast('A name or an email — one of the two')
        return
      }
      const saved = edit((l) => {
        const others = held.main ? l.contacts.map((c) => ({ ...c, main: false })) : l.contacts
        return {
          ...l,
          contacts: index >= 0 && others[index] ? others.map((c, i) => (i === index ? { ...c, ...held } : c)) : [...others, { ...held }],
        }
      })
      if (!saved) return
      closeModal()
      toast(index >= 0 ? `${held.n || held.e} saved` : `${held.n || held.e} added`)
    }
    openModal({
      title: index >= 0 ? 'Edit contact' : `Add a contact at ${lead.co}`,
      body: (
        <Form id="lc-form" onSubmit={save}>
          <ContactFields initial={initial} onChange={(d) => Object.assign(held, d)} />
        </Form>
      ),
      footer: (
        <>
          <Btn variant="ghost" onClick={closeModal}>
            Cancel
          </Btn>
          <Btn submit form="lc-form">
            Save contact
          </Btn>
        </>
      ),
    })
  }

  const editLead = () => {
    const initial: LeadFields = { co: lead.co, loc: lead.loc, st: lead.st, own: lead.own }
    const held = { ...initial }
    const save = () => {
      if (!held.co.trim()) {
        toast('A company name is required')
        return
      }
      const saved = edit((l) => ({
        ...l,
        co: held.co.trim(),
        loc: held.loc.trim() || '—',
        st: held.st,
        own: held.own,
        flag: ['won', 'lost'].includes(held.st) ? false : !!l.flag,
      }))
      if (!saved) return
      closeModal()
      toast(`${held.co.trim()} saved`)
    }
    openModal({
      title: `Edit ${lead.co}`,
      body: (
        <Form id="ld-form" onSubmit={save}>
          <LeadDetailFields initial={initial} onChange={(d) => Object.assign(held, d)} />
        </Form>
      ),
      footer: (
        <>
          <Btn variant="ghost" onClick={closeModal}>
            Cancel
          </Btn>
          <Btn submit form="ld-form">
            Save changes
          </Btn>
        </>
      ),
    })
  }

  const firstContact = firstOf(lead.notes)

  return (
    <>
      <PageHead
        parent={{ to: '/leads', label: 'Leads' }}
        title={lead.co}
        sub={`${lead.loc} · ${lead.contacts.length} contact${lead.contacts.length === 1 ? '' : 's'} · owned by ${whoName(lead.own)}`}
        actions={
          <>
            <Select
              label="Status"
              style={{ minWidth: 150 }}
              value={lead.st}
              onChange={setStatus}
              options={Object.entries(LSTATUS).map(([k, v]) => [k as Lead['st'], v[0]] as const)}
            />
            <Btn variant={lead.flag ? 'primary' : 'ghost'} onClick={toggleFlag}>
              {lead.flag ? '✓ Flagged for follow-up' : 'Flag for follow-up'}
            </Btn>
          </>
        }
      />

      <LeadBanner
        lead={lead}
        age={age}
        stale={stale}
        onCopy={copyDetails}
        onClients={() => navigate({ to: '/company' })}
        onToggleFlag={toggleFlag}
      />

      <div className="two">
        <div>
          <Card>
            <div className="ch">
              <h2>Notes</h2>
              <div className="r gr" style={{ fontSize: 'var(--t-small)' }}>
                {lead.notes.length} · last {age} day{age === 1 ? '' : 's'} ago
              </div>
            </div>
            <CardBody>
              <Form onSubmit={addNote}>
                <Textarea
                  label="Add a note"
                  id="lead-note"
                  placeholder="What happened — what they said, what you quoted, what you agreed"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      addNote()
                    }
                  }}
                />
                <Inline wrap gap={9} style={{ marginTop: 10 }}>
                  <Btn small submit disabled={!draft.trim()}>
                    Add note
                  </Btn>
                  <Field
                    layout="wrap"
                    style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 'var(--t-small)' }}
                    className="gr"
                    label=" Keep flagged for follow-up"
                  >
                    <Checkbox field checked={!!lead.flag} onChange={toggleFlag} />
                  </Field>
                  <span className="gr" style={{ fontSize: 'var(--t-label)', marginLeft: 'auto' }}>
                    Adding a note resets the quiet clock
                  </span>
                </Inline>
              </Form>
            </CardBody>
            <Rows bare>
              {notes.map((n, i) => (
                <div
                  className="rw"
                  key={`${n.at.getTime()}-${i}`}
                  style={{ gridTemplateColumns: '32px 1fr auto', alignItems: 'flex-start' }}
                >
                  <span className="ava" style={{ width: 28, height: 28, fontSize: 'var(--t-mini)' }}>
                    {initials(whoName(n.w ?? n.who ?? ''))}
                  </span>
                  <span>
                    <div style={{ fontSize: 'var(--t-body)' }}>{n.t}</div>
                    <div className="sd">{whoName(n.w ?? n.who ?? '')}</div>
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <div className="mono gr" style={{ fontSize: 'var(--t-label)' }}>
                      {fmtDate(n.at)}
                    </div>
                    <div className="sd">
                      {daysSince(n.at)} day{daysSince(n.at) === 1 ? '' : 's'} ago
                    </div>
                  </span>
                </div>
              ))}
            </Rows>
          </Card>
        </div>

        <aside>
          <LeadContacts contacts={lead.contacts} onEdit={editContact} />

          <Card padded top={16}>
            <Label>Lead</Label>
            <KeyValues
              rows={[
                ['Status', <Chip kind={kind}>{label}</Chip>],
                ['Owner', whoName(lead.own)],
                ['Location', lead.loc],
                ['First contact', <span className="mono">{firstContact ? fmtDate(firstContact) : '—'}</span>],
                ['Last contact', <span className="mono">{fmtDate(lastTouch(lead))}</span>],
                ['Notes', String(lead.notes.length)],
              ]}
            />
            <Btn variant="ghost" small style={{ width: '100%', marginTop: 12 }} onClick={editLead}>
              Edit details
            </Btn>
          </Card>
        </aside>
      </div>
    </>
  )
}

export default function Guarded() {
  return (
    <RequireCap cap="pricing">
      <LeadDetail />
    </RequireCap>
  )
}
