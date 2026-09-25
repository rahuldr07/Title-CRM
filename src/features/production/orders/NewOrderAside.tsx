import { useStageName } from '@/domain/company/naming'
import { Btn, LinkButton, Press } from '@/shared/ui/Button'
import { Card, Label } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import type { Go } from '@/shared/hooks/useGo'
import { ASSIGN_STAGES } from '@/data/org'
import type { County, CountyLink, Tier } from '@/data/types'
import type { PreviewSlot } from '@/domain/assignment/engine'
import { isDefaultRule, type Due, type SlaRule } from '@/domain/assignment/sla'
import { whoName } from '@/domain/people/roster'
import { LSTATE } from '@/domain/counties/links'
import { useCoverage } from '@/domain/counties/counties'
import { fmtDT, initials, money, toIst, TZ, TZ2 } from '@/shared/lib/format'
import type { Draft } from './fromMail'
import { Inline, Note } from '@/shared/ui/Layout'

const NO_LINK: CountyLink = { u: '', s: 'none' }

function AsideLabel({ children }: { children: string }) {
  return (
    <div className="lb" style={{ marginTop: 20 }}>
      {children}
    </div>
  )
}

interface Props {
  f: Draft
  due: Due
  sla: SlaRule
  tier: Tier
  productId: string
  productFee: number
  fee: number
  county: County | undefined
  preview: Record<string, PreviewSlot>
  pricing: boolean
  navigate: Go
}

export function NewOrderAside({
  f,
  due,
  sla,
  tier,
  productId,
  productFee,
  fee,
  county,
  preview,
  pricing,
  navigate,
}: Props) {
  const { linkTypes } = useCoverage()
  const stageName = useStageName()
  const unplaced = ASSIGN_STAGES.filter((s) => preview[s]?.err).length
  const openPerson = (id: string) => navigate({ to: '/staff/$personId', params: { personId: id } })
  return (
    <aside>
      <Card padded style={{ position: 'sticky', top: 76 }}>
        <Label>Due</Label>
        <div className="mono" style={{ fontSize: 'var(--t-h3)', fontWeight: 600 }}>
          {fmtDT(due.at)}{' '}
          <span className="gr" style={{ fontSize: 'var(--t-label)' }}>
            {TZ}
          </span>
        </div>
        <div className="gr mono" style={{ fontSize: 'var(--t-label)', marginTop: 3 }}>
          {fmtDT(toIst(due.at))} {TZ2}
        </div>
        <Note size="label" top={8}>
          {due.h}h from now —{' '}
          {isDefaultRule(sla)
            ? `the ${due.base}h default for ${productId}`
            : `${sla.cl} × ${sla.pr} is ${due.base}h`}
          {tier.mult !== 1 ? `, ${tier.n.toLowerCase()} at ×${tier.mult}` : ''}.
        </Note>

        <AsideLabel>Coverage</AsideLabel>
        {!f.county ? (
          <Note>
            Enter a county to check.
          </Note>
        ) : county ? (
          <>
            <Inline gap={8}>
              <Chip kind={county.idx ? 'v' : 'r'}>
                {county.idx ? `Recorder online ${county.idx}` : 'Recorder manual'}
              </Chip>
            </Inline>
            {linkTypes.map((t) => {
              const l = county.links[t.k] ?? NO_LINK
              if (l.s === 'ok') return null
              return (
                <p
                  key={t.k}
                  className={l.s === 'none' ? 'warn' : 'bad'}
                  style={{ fontSize: 'var(--t-label)', marginTop: 6 }}
                >
                  {t.n}: {LSTATE[l.s][0].toLowerCase()}
                  {l.err ? ` — ${l.err}` : ''}
                </p>
              )
            })}
            {linkTypes.every((t) => (county.links[t.k] ?? NO_LINK).s === 'ok') ? (
              <p className="ok" style={{ fontSize: 'var(--t-label)', marginTop: 6 }}>
                All four links working.
              </p>
            ) : (
              <Btn
                variant="ghost"
                small
                style={{ marginTop: 8 }}
                onClick={() => navigate({ to: '/linkcheck' })}
              >
                Link monitor
              </Btn>
            )}
          </>
        ) : (
          <>
            <div>
              <Chip kind="d">Not on file</Chip>
            </div>
            <Note size="label" top={7}>
              {f.county}, {f.st} is not in your county record. You can still place the order — the
              searcher will be working without the links.
            </Note>
            <Btn
              variant="ghost"
              small
              style={{ marginTop: 8 }}
              onClick={() => navigate({ to: '/counties' })}
            >
              Add the county
            </Btn>
          </>
        )}

        <AsideLabel>Who would pick it up</AsideLabel>
        {ASSIGN_STAGES.map((s) => {
          const a = preview[s]
          const who = a?.who
          return (
            <Inline key={s} gap={8} style={{ padding: '5px 0', fontSize: 'var(--t-small)' }}>
              <span className="gr" style={{ width: 82, flex: 'none' }}>
                {stageName(s)}
              </span>
              {who ? (
                <>
                  <Press
                    className="ava"
                    style={{ width: 21, height: 21, fontSize: 'var(--t-mini)' }}
                    title="Open profile"
                    onClick={() => openPerson(who)}
                  >
                    {initials(whoName(who))}
                  </Press>
                  <LinkButton onClick={() => openPerson(who)}>{whoName(who)}</LinkButton>
                </>
              ) : (
                <span className="bad">— {a?.err}</span>
              )}
            </Inline>
          )
        })}
        {unplaced ? (
          <p className="warn" style={{ fontSize: 'var(--t-label)', marginTop: 7 }}>
            {unplaced} stage{unplaced === 1 ? '' : 's'} would land in the exception queue.
          </p>
        ) : (
          <Note size="label" top={7}>
            Applying today’s rules and current load. It commits when you create the order.
          </Note>
        )}

        {pricing ? (
          <>
            <AsideLabel>Price</AsideLabel>
            <dl className="kv" style={{ fontSize: 'var(--t-small)' }}>
              <dt>{productId}</dt>
              <dd className="mono">{money(productFee)}</dd>
              {tier.up ? (
                <>
                  <dt>{tier.n}</dt>
                  <dd className="mono">+{money(tier.up)}</dd>
                </>
              ) : null}
              <dt style={{ fontWeight: 600 }}>Total</dt>
              <dd className="mono" style={{ fontWeight: 600 }}>
                {money(fee)}
              </dd>
            </dl>
          </>
        ) : null}

        <Btn submit style={{ width: '100%', marginTop: 18 }}>
          Create order
        </Btn>
        <Btn
          variant="ghost"
          style={{ width: '100%', marginTop: 8 }}
          onClick={() => navigate({ to: '/orders' })}
        >
          Cancel
        </Btn>
      </Card>
    </aside>
  )
}
