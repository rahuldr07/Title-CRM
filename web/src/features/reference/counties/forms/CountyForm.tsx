import { useState } from 'react'
import { daysSince } from '@/shared/lib/format'
import { countyName, removeCounty, saveCounty, useCoverage } from '@/domain/counties/counties'
import { Banner } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Field, Fields, Form, FormActions, FormAlert } from '@/shared/ui/Form'
import { useFormAlert } from '@/shared/hooks/useFormAlert'
import { Input } from '@/shared/ui/Controls'
import { Label } from '@/shared/ui/Card'
import { LSTATE, isBrokenLink } from '@/domain/counties/links'
import { isDuplicateName } from '@/shared/lib/forms'
import type { County, CountyLink } from '@/data/types'
import { useSession } from '@/domain/auth/SessionProvider'
import { Note } from '@/shared/ui/Layout'

export function CountyForm({
  county,
  onDone,
  onCancel,
}: {
  county: County | null
  onDone: () => void
  onCancel: () => void
}) {
  const { counties, linkTypes, check } = useCoverage()
  const [n, setN] = useState(county?.n ?? '')
  const [st, setSt] = useState(county?.st ?? '')
  const [idx, setIdx] = useState(county?.idx ? String(county.idx) : '')
  const [urls, setUrls] = useState<Record<string, string>>(() =>
    Object.fromEntries(linkTypes.map((t) => [t.k, county?.links[t.k]?.u ?? ''])),
  )
  const alert = useFormAlert<'name' | 'state'>()
  const { me } = useSession()
  const [confirming, setConfirming] = useState(false)

  const submit = () => {
    const name = n.trim()
    const state = st.trim().toUpperCase()
    if (!name) return alert.fail('A county name is required.', 'name')
    if (!/^[A-Z]{2}$/.test(state)) return alert.fail('Use a two-letter state code.', 'state')

    const inState = counties.filter((c) => c.st === state)
    const isEdited = (c: County) => !!county && c.n === county.n && c.st === county.st
    if (isDuplicateName(inState, name, (c) => c.n, isEdited))
      return alert.fail(`${name}, ${state} is already on file.`, 'name')

    const links: Record<string, CountyLink> = {}
    for (const t of linkTypes) {
      const u = (urls[t.k] ?? '').trim()
      const prev = county?.links[t.k] ?? null
      links[t.k] = !u
        ? { u: '', s: 'none' }
        : prev && prev.u === u
          ? prev
          : { u, s: 'unchecked' }
    }

    const parsed = parseInt(idx, 10)
    const refused = saveCounty(
      me,
      { n: name, st: state, idx: Number.isFinite(parsed) ? parsed : null, links },
      county ? { n: county.n, st: county.st } : undefined,
    )
    if (refused) return alert.fail(refused)
    onDone()
  }

  if (confirming && county) {
    const held = linkTypes.filter((t) => county.links[t.k]?.u).length
    return (
      <>
        <Note size="body" plain>
          Removing <b>{countyName(county.n, county.st)}, {county.st}</b> takes it off the coverage record.{' '}
          {held
            ? `The ${held} link${held === 1 ? '' : 's'} on file ${held === 1 ? 'goes' : 'go'} with it.`
            : 'It has no links on file, so nothing else is lost.'}
        </Note>
        <Banner kind="d" icon="⚑" top={14}>
          Order intake validates against this record, so an order for {county.n} can no longer be
          taken.
        </Banner>
        <FormActions>
          <Btn variant="ghost" onClick={() => setConfirming(false)}>
            Cancel
          </Btn>
          <Btn
            variant="danger"
            onClick={() => {
              const refused = removeCounty(me, county.n, county.st)
              if (refused) {
                setConfirming(false)
                return alert.fail(refused)
              }
              onDone()
            }}
          >
            Remove {county.n}
          </Btn>
        </FormActions>
      </>
    )
  }

  return (
    <Form onSubmit={submit}>
      <FormAlert alert={alert} bottom={14} />

      <Fields>
        <Field label="County" error={alert.on('name')}>
          <Input
            field
            id="cy-n"
            autoComplete="off"
            value={n}
            onChange={(e) => {
              setN(e.target.value)
              alert.clear()
            }}
          />
        </Field>
        <Field label="State" error={alert.on('state')}>
          <Input
            field
            id="cy-s"
            maxLength={2}
            placeholder="PA"
            autoComplete="off"
            value={st}
            onChange={(e) => {
              setSt(e.target.value)
              alert.clear()
            }}
          />
        </Field>
        <Field
          label="Recorder index starts"
          wide
          hint="A search that has to go deeper than this needs a courthouse trip. Quoting uses it."
        >
          <Input
            field
            mono
            id="cy-i"
            placeholder="leave blank if manual"
            autoComplete="off"
            value={idx}
            onChange={(e) => setIdx(e.target.value)}
          />
        </Field>
      </Fields>

      <div style={{ marginTop: 18 }}>
        <Label>Links</Label>
      </div>
      <div style={{ display: 'grid', gap: 9 }}>
        {linkTypes.map((t) => {
          const l = county?.links[t.k] ?? { u: '', s: 'none' as const }
          const flagged = isBrokenLink(l)
          return (
            <Field
              key={t.k}
              id={`cy-${t.k}`}
              label={
                <>
                  {t.n}
                  {county ? (
                    <span
                      className={`chip ${LSTATE[l.s][1]}`}
                      style={{ fontSize: 'var(--t-mini)', padding: '1px 7px', marginLeft: 5 }}
                    >
                      {LSTATE[l.s][0]}
                    </span>
                  ) : null}
                </>
              }
            >
              <Input
                field
                label={t.n}
                mono
                placeholder="no link on file"
                autoComplete="off"
                style={{
                  fontSize: 'var(--t-small)',
                  ...(flagged
                    ? { borderColor: 'var(--flagline)', background: 'var(--flag)' }
                    : {}),
                }}
                value={urls[t.k] ?? ''}
                onChange={(e) => setUrls((u) => ({ ...u, [t.k]: e.target.value }))}
              />
              {l.err ? (
                <div className="hint bad">
                  {l.err} — first seen {l.since ? daysSince(l.since) : '—'} days ago
                </div>
              ) : null}
            </Field>
          )
        })}
      </div>

      <Banner kind="b" icon="◷" margin="16px 0 0">
        <span style={{ fontSize: 'var(--t-small)' }}>
          All {linkTypes.length} are checked automatically every {check.every} days. Anything
          that stops working is reported to{' '}
          {check.notify === 'admins' ? 'company admins' : check.notify}.
        </span>
      </Banner>

      <FormActions>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        {county ? (
          <Btn variant="danger" onClick={() => setConfirming(true)}>
            Remove
          </Btn>
        ) : null}
        <Btn submit>{county ? 'Save county' : 'Add county'}</Btn>
      </FormActions>
    </Form>
  )
}
