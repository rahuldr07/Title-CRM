import { Banner } from '@/shared/ui/Banner'
import { Card, Label } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { Field } from '@/shared/ui/Form'
import { Checkbox } from '@/shared/ui/Controls'
import { QC_CRITERIA, QC_SCALE } from '@/domain/quality/quality'
import { setQcRule, useQcRules } from '@/domain/quality/qcRules'
import { useSession } from '@/domain/auth/SessionProvider'
import { useRefusal } from '@/shared/hooks/useRefusal'
import { Inline, Note } from '@/shared/ui/Layout'

export function QcScoringConfig() {
  const { me } = useSession()
  const refuse = useRefusal()
  const rules = useQcRules()
  const off = rules.filter((r) => !r.on)

  return (
    <>
      <Note margin="0 0 16px">
        How work is checked, and what a score is allowed to mean.
      </Note>

      <Card padded>
        <Label>Rating scale</Label>
        <Note bottom={13}>
          Note the direction: <b>1 is the worst outcome and 5 the best</b> — the opposite of what most people
          assume, so the word is shown next to the number everywhere it appears.
        </Note>
        <div style={{ display: 'grid', gap: 7 }}>
          {QC_SCALE.map(([score, label, kind]) => (
            <Inline key={score} gap={12} style={{ padding: '10px 13px', border: '1px solid var(--hair)', borderRadius: 9, background: 'var(--tint)' }}>
              <Chip kind={kind}>
                {score} · {label}
              </Chip>
              <span className="gr" style={{ fontSize: 'var(--t-small)', marginLeft: 'auto' }}>
                {score === 1 ? 'blocks delivery until resolved' : score <= 3 ? 'logged as a defect' : 'passes'}
              </span>
            </Inline>
          ))}
        </div>
      </Card>

      <Card padded top={18}>
        <Label>What gets scored</Label>
        <Note bottom={13}>
          One number couldn't say <i>what</i> was wrong. Three can.
        </Note>
        <div style={{ display: 'grid', gap: 9 }}>
          {QC_CRITERIA.map(([name, , question]) => (
            <Inline key={name} align="flex-start" gap={12} style={{ padding: '12px 14px', border: '1px solid var(--hair)', borderRadius: 9 }}>
              <span className="ok">✓</span>
              <span>
                <b>{name}</b>
                <div className="sd gr" style={{ fontSize: 'var(--t-small)' }}>
                  {question}
                </div>
              </span>
            </Inline>
          ))}
        </div>
      </Card>

      <Card padded top={18}>
        <Label>Rules</Label>
        <div style={{ display: 'grid', gap: 9 }}>
          {rules.map((r) => (
            <Field
              key={r.k}
              layout="wrap"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 11,
                fontSize: 'var(--t-body)',
                padding: '12px 14px',
                border: '1px solid var(--hair)',
                borderRadius: 9,
                background: r.on ? 'var(--tint)' : 'var(--card)',
              }}
              label={
                <span>
                  <b>{r.n}</b>
                  <div className="sd gr" style={{ fontSize: 'var(--t-small)' }}>
                    {r.d}
                  </div>
                </span>
              }
            >
              <Checkbox
                field
                checked={r.on}
                style={{ marginTop: 2 }}
                onChange={(e) => refuse(setQcRule(me, r.k, e.target.checked))}
              />
            </Field>
          ))}
        </div>
        {off.length ? (
          <Banner
            kind="r"
            icon="⚠"
            title={`${off.length} rule${off.length === 1 ? ' is' : 's are'} off, and each has a cost`}
            top={14}
          >
            {off.map((r) => r.cost).join(' ')}
          </Banner>
        ) : null}
      </Card>

      <Banner kind="r" icon="★" title="Worth deciding what a rating is for" top={18}>
        Today it is 67% coverage and almost every score is a 5, which means it isn't separating anyone.
        Coaching, pay, or a filing requirement — the answer changes whether the person rated should see it,
        and whether raters will ever give a 3.
      </Banner>
    </>
  )
}
