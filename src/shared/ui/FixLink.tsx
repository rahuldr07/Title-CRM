import { useState } from 'react'
import { Banner } from './Banner'
import { Btn } from './Button'
import { Field, Fields, Form, FormActions } from './Form'
import { Input } from './Controls'
import { LSTATE, isBrokenLink, nextLinkCheck } from '@/domain/counties/links'
import { daysSince, fmtDate } from '@/shared/lib/format'
import { saveLink, useCoverage } from '@/domain/counties/counties'
import type { County, LinkType } from '@/data/types'
import { useSession } from '@/domain/auth/SessionProvider'

export function FixLink({
  county,
  type,
  onDone,
  onCancel,
}: {
  county: County
  type: LinkType
  onDone: (message: string) => void
  onCancel: () => void
}) {
  const { check } = useCoverage()
  const { me } = useSession()
  const l = county.links[type.k] ?? { u: '', s: 'none' as const }
  const [url, setUrl] = useState(l.u)
  const failing = isBrokenLink(l)
  const since = daysSince(check.last)

  const save = () => {
    const refused = saveLink(me, county.n, county.st, type.k, { url })
    onDone(
      refused ??
        (url.trim() ? `${type.n} — ${county.n} saved, awaiting a check` : `${type.n} — ${county.n} link removed`),
    )
  }

  return (
    <Form onSubmit={save}>
      <Fields>
        <Field label="Address" wide>
          <Input
            field
            mono
            id="lk-u"
            placeholder="no link on file"
            autoComplete="off"
            style={{ fontSize: 'var(--t-small)' }}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </Field>
      </Fields>

      {failing ? (
        <Banner
          kind="d"
          icon="⚑"
          title={<span style={{ fontSize: 'var(--t-small)' }}>{LSTATE[l.s][0]}{l.err ? ` — ${l.err}` : ''}</span>}
          style={{ marginTop: 14 }}
        >
          <span style={{ fontSize: 'var(--t-small)' }}>
            First seen {l.since ? daysSince(l.since) : '—'} days ago. Searchers working {county.n} have
            been without it since.
          </span>
        </Banner>
      ) : null}

      <Banner kind="b" icon="◷" style={{ marginTop: 14 }}>
        <span style={{ fontSize: 'var(--t-small)' }}>
          Checked every {check.every} days. Last run {since === 0 ? 'today' : `${since} days ago`},
          next {fmtDate(nextLinkCheck())}.
        </span>
      </Banner>

      <FormActions>
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn
          variant="ghost"
          onClick={() => {
            onDone(saveLink(me, county.n, county.st, type.k, { markOk: true }) ?? `${type.n} — ${county.n} marked working`)
          }}
        >
          Mark working
        </Btn>
        <Btn submit>Save link</Btn>
      </FormActions>
    </Form>
  )
}
