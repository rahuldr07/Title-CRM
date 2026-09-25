import { useState } from 'react'
import { Banner } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Chip } from '@/shared/ui/Chip'
import { Field, Fields, Form, FormActions, FormAlert } from '@/shared/ui/Form'
import { useFormAlert } from '@/shared/hooks/useFormAlert'
import { Input, Select } from '@/shared/ui/Controls'
import { Rows } from '@/shared/ui/DetailList'
import { isDuplicateName } from '@/shared/lib/forms'
import {
  moveLinkType,
  removeLinkType,
  saveLinkType,
  useCoverage,
} from '@/domain/counties/counties'
import { typeUsage } from '@/domain/counties/links'
import { useSession } from '@/domain/auth/SessionProvider'
import { useUi } from '@/shared/ui/UiProvider'
import { Note } from '@/shared/ui/Layout'

export type LtView = { at: 'list' } | { at: 'edit'; k?: string } | { at: 'confirm'; k: string }

export function LinkTypes({
  view,
  onView,
  onClose,
}: {
  view: LtView
  onView: (v: LtView) => void
  onClose: () => void
}) {
  const { linkTypes, counties } = useCoverage()
  const { me } = useSession()
  const { toast } = useUi()
  const refuse = (refused: string | null) => {
    if (refused) toast(refused)
  }

  if (view.at === 'edit') {
    return <EditType k={view.k} onView={onView} />
  }

  if (view.at === 'confirm') {
    const t = linkTypes.find((x) => x.k === view.k)
    if (!t) return null
    const usage = typeUsage(t.k)
    const last = linkTypes.length <= 1
    return (
      <>
        <Note size="body" plain>
          {usage.held ? (
            <>
              <b>
                {usage.held} {usage.held === 1 ? 'county has' : 'counties have'}
              </b>{' '}
              a {t.n} link on file. Removing the type discards{' '}
              {usage.held === 1 ? 'that address' : 'those addresses'}.
            </>
          ) : (
            'No county has one on file, so nothing is lost.'
          )}
        </Note>
        {last ? (
          <Banner kind="d" icon="⚑" top={14}>
            This is the last link type. A county with no links is not much use.
          </Banner>
        ) : null}
        <FormActions>
          <Btn variant="ghost" onClick={() => onView({ at: 'list' })}>
            Cancel
          </Btn>
          <Btn
            variant="danger"
            disabled={last}
            onClick={() => {
              refuse(removeLinkType(me, t.k))
              onView({ at: 'list' })
            }}
          >
            Remove {t.n}
          </Btn>
        </FormActions>
      </>
    )
  }

  return (
    <>
      <Note bottom={14}>
        Every county holds one link of each type. Adding a type gives all {counties.length} counties
        a new empty slot, and the checker picks it up on its next run.
      </Note>
      <Rows>
        {linkTypes.map((t, i) => {
          const u = typeUsage(t.k)
          return (
            <div className="rw" key={t.k} style={{ gridTemplateColumns: '1fr auto' }}>
              <span>
                <b>{t.n}</b>
                {t.req ? <Chip kind="b">Required</Chip> : null}
                <div className="sd">{t.note}</div>
                <div className="sd" style={{ marginTop: 3 }}>
                  {u.held} of {counties.length} counties have one
                  {u.bad ? <> · <span className="bad">{u.bad} not working</span></> : null}
                  {u.missing ? ` · ${u.missing} missing` : ''}
                </div>
              </span>
              <span style={{ display: 'flex', gap: 5 }}>
                <Btn
                  variant="ghost"
                  small
                  disabled={i === 0}
                  aria-label={`Move ${t.n} up`}
                  onClick={() => refuse(moveLinkType(me, t.k, -1))}
                >
                  ↑
                </Btn>
                <Btn
                  variant="ghost"
                  small
                  disabled={i === linkTypes.length - 1}
                  aria-label={`Move ${t.n} down`}
                  onClick={() => refuse(moveLinkType(me, t.k, 1))}
                >
                  ↓
                </Btn>
                <Btn variant="ghost" small onClick={() => onView({ at: 'edit', k: t.k })}>
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
        <Btn onClick={() => onView({ at: 'edit' })}>＋ Add a link type</Btn>
      </FormActions>
    </>
  )
}

function EditType({ k, onView }: { k?: string | undefined; onView: (v: LtView) => void }) {
  const { linkTypes, counties } = useCoverage()
  const { me } = useSession()
  const existing = linkTypes.find((x) => x.k === k)
  const [name, setName] = useState(existing?.n ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [req, setReq] = useState(existing?.req ?? false)
  const alert = useFormAlert<'name'>()

  const usage = k ? typeUsage(k) : null

  const submit = () => {
    const n = name.trim()
    if (!n) return alert.fail('A name is required.', 'name')
    if (isDuplicateName(linkTypes, n, (x) => x.n, (x) => x.k === k))
      return alert.fail(`There is already a link type called ${n}.`, 'name')
    const refused = saveLinkType(me, { n, note: note.trim(), req }, k)
    if (refused) return alert.fail(refused)
    onView({ at: 'list' })
  }

  return (
    <Form onSubmit={submit}>
      <FormAlert alert={alert} bottom={14} />

      <Fields>
        <Field label="Name" error={alert.on('name')}>
          <Input
            field
            id="lt-n"
            placeholder="e.g. Municipal lien"
            autoComplete="off"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              alert.clear()
            }}
          />
        </Field>
        <Field label="Required">
          <Select
            field
            id="lt-r"
            value={req ? '1' : '0'}
            onChange={(v) => setReq(v === '1')}
            options={[
              ['1', 'Yes — a county without it counts as a gap'],
              ['0', 'No — nice to have'],
            ]}
          />
        </Field>
        <Field label="What it is for" wide>
          <Input
            field
            id="lt-d"
            placeholder="One line, shown to whoever fills it in"
            autoComplete="off"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </Fields>

      {k && usage ? (
        <Banner kind="b" icon="◔" margin="16px 0 0">
          <b>
            {usage.held} of {counties.length}
          </b>{' '}
          counties have this link
          {usage.bad ? `, and ${usage.bad} of those are not working` : ''}.
        </Banner>
      ) : (
        <Banner
          kind="b"
          icon="◈"
          title={`All ${counties.length} counties get an empty slot`}
          margin="16px 0 0"
        >
          Nothing is invented — each one shows as <b>no link on file</b> until someone fills it in,
          and the checker starts covering it on the next run.
        </Banner>
      )}

      <FormActions>
        <Btn variant="ghost" onClick={() => onView({ at: 'list' })}>
          Back
        </Btn>
        {k ? (
          <Btn variant="danger" onClick={() => onView({ at: 'confirm', k })}>
            Remove
          </Btn>
        ) : null}
        <Btn submit>{k ? 'Save' : 'Add link type'}</Btn>
      </FormActions>
    </Form>
  )
}
