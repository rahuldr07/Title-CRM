import { Btn } from '@/shared/ui/Button'
import { Banner, Empty } from '@/shared/ui/Banner'
import { Card, Label } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { Field, Fields } from '@/shared/ui/Form'
import { WebLink } from '@/shared/ui/WebLink'
import type { Go } from '@/shared/hooks/useGo'
import type { County } from '@/data/types'
import { LSTATE, isBrokenLink, linkGaps } from '@/domain/counties/links'
import { useCoverage } from '@/domain/counties/counties'
import { daysSince } from '@/shared/lib/format'

interface Props {
  co: string
  st: string
  county: County | undefined
  navigate: Go
}

export function OrderCountyLinksTab({ co, st, county, navigate }: Props) {
  const { linkTypes, check } = useCoverage()
  const gaps = county ? linkGaps(county) : null
  const names = (list: readonly { n: string }[]) => list.map((t) => t.n).join(', ')
  return (
    <Card padded>
      <Label>
        County research links — {co}, {st}
      </Label>
      {county ? (
        <>
          <Fields>
            {linkTypes.map((t) => {
              const l = county.links[t.k]
              const status = l?.s ?? 'none'
              return (
                <Field
                  key={t.k}
                  label={
                    <>
                      {t.n}{' '}
                      {status === 'ok' ? null : (
                        <Chip kind={LSTATE[status][1]}>{LSTATE[status][0]}</Chip>
                      )}
                    </>
                  }
                  hint={
                    l?.err ? (
                      <span className="bad">
                        {l.err} — {l.since ? `${daysSince(l.since)} days` : 'recently'}
                      </span>
                    ) : undefined
                  }
                >
                  {l?.u ? (
                    <div
                      className={`ro${isBrokenLink(l) ? ' warn' : ''}`}
                      style={{ fontSize: 'var(--t-label)', overflowWrap: 'anywhere' }}
                    >
                      <WebLink address={l.u} />
                    </div>
                  ) : (
                    <div className="ro warn">Not on file</div>
                  )}
                </Field>
              )
            })}
          </Fields>

          {gaps && (gaps.missing.length || gaps.broken.length) ? (
            <Banner
              kind="r"
              icon="⚑"
              title="The searcher is short of at least one link here"
              margin="16px 0 0"
              actions={
                <Btn variant="ghost" small onClick={() => navigate({ to: '/linkcheck' })}>
                  Link monitor
                </Btn>
              }
            >
              {gaps.missing.length ? <>Not on file: {names(gaps.missing)}. </> : null}
              {gaps.broken.length ? <>Failing the link check: {names(gaps.broken)}. </> : null}
              Checked every {check.every} days; last run{' '}
              {daysSince(check.last) === 0 ? 'today' : `${daysSince(check.last)} days ago`}.
            </Banner>
          ) : (
            <p className="ok" style={{ fontSize: 'var(--t-small)', marginTop: 12 }}>
              All {linkTypes.length} links working as of the last check.
            </p>
          )}
        </>
      ) : (
        <Empty
          icon="◈"
          action={
            <Btn variant="ghost" small onClick={() => navigate({ to: '/counties' })}>
              Add the county
            </Btn>
          }
        >
          {co}, {st} is not in your county record, so the searcher has no links for it.
        </Empty>
      )}
    </Card>
  )
}
