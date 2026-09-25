import { useStageName } from '@/domain/company/naming'
import { Avatar } from '@/shared/ui/Avatar'
import { Banner, Empty } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Card, CardHead } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { Field, Fields } from '@/shared/ui/Form'
import { Input, Select } from '@/shared/ui/Controls'
import { Rows } from '@/shared/ui/DetailList'
import type { Assignments } from '@/data/types'
import { whoName } from '@/domain/people/roster'
import { ratingComplete, type QcField, type StageRating } from '@/domain/orders/orders'
import { QC_CRITERIA, QC_SCALE } from '@/domain/quality/quality'
import { ratingChip } from './ratingChip'
import { Inline } from '@/shared/ui/Layout'

interface Props {
  assign: Assignments
  worked: readonly string[]
  rated: boolean
  unrated: readonly string[]
  rateable: readonly string[]
  whyNot: Readonly<Record<string, string>>
  stored: Record<string, StageRating>
  scoring: Record<string, StageRating>
  mayQc: boolean
  onScore: (stage: string, field: QcField, v: number) => void
  onComment: (stage: string, text: string) => void
  onSave: () => void
  onDefect: () => void
  onGoToAssignment: () => void
}

export function OrderQualityTab({
  assign,
  worked,
  rated,
  unrated,
  rateable,
  whyNot,
  stored,
  scoring,
  mayQc,
  onScore,
  onComment,
  onSave,
  onDefect,
  onGoToAssignment,
}: Props) {
  const stageName = useStageName()
  const started = rateable.filter((s) => scoring[s])
  const ready = started.length > 0 && started.every((s) => ratingComplete(scoring[s]))
  return (
    <>
      <Banner
        kind={rated ? 'v' : 'r'}
        icon={rated ? '✓' : '★'}
        title={
          rated
            ? 'Rated — all stages scored before delivery'
            : 'A rating is required before this order can be marked Sent'
        }
      >
        {rated
          ? 'Every person who touched this order was scored on all three criteria.'
          : 'Each stage worked needs a score from someone other than the person who worked it: whoever holds the paired QC stage, or someone who sees every order. Unrated stages block delivery.'}
        <div className="bs">
          Scale: {QC_SCALE.map(([n, label]) => `${n} ${label}`).join(' · ')}.{' '}
          <b>1 is the worst outcome, 5 the best.</b>
        </div>
      </Banner>

      <Card>
        <CardHead
          title="Rate the people on this order"
          actions={
            <span className="gr" style={{ fontSize: 'var(--t-small)' }}>
              {worked.length} stage{worked.length === 1 ? '' : 's'} worked
            </span>
          }
        />
        {worked.length ? (
          <Rows bare>
            {worked.map((s) => (
              <div className="rw" style={{ gridTemplateColumns: '1fr', gap: 11 }} key={s}>
                <Inline wrap gap={11}>
                  <Avatar name={whoName(assign[s])} />
                  <span>
                    <b>{whoName(assign[s])}</b>
                    <div className="sd">{stageName(s)}</div>
                  </span>
                  <span style={{ marginLeft: 'auto' }}>
                    {!unrated.includes(s) ? (
                      <Chip kind={ratingChip(stored[s]).kind}>{ratingChip(stored[s]).text}</Chip>
                    ) : (
                      <Chip kind="r">Not rated</Chip>
                    )}
                  </span>
                </Inline>
                {!unrated.includes(s) ? (
                  stored[s]?.comment ? (
                    <div className="sd">{stored[s].comment}</div>
                  ) : null
                ) : !rateable.includes(s) ? (
                  <div className="sd">{whyNot[s]}</div>
                ) : (
                  <Fields style={{ gap: 11 }}>
                    {QC_CRITERIA.map(([name, field, question]) => (
                      <Field key={name} label={name} hint={question}>
                        <Select
                          field
                          label={`${name} for ${whoName(assign[s])}`}
                          value={String(scoring[s]?.scores[field] ?? '')}
                          onChange={(v) => onScore(s, field, Number(v))}
                          options={[['', '— score —'], ...QC_SCALE.map(([n, label]) => [String(n), `${n} · ${label}`] as const)]}
                        />
                      </Field>
                    ))}
                    <Field label="Comment" wide>
                      <Input
                        field
                        label={`Comment for ${whoName(assign[s])}`}
                        placeholder="What specifically — field, page, what was wrong"
                        value={scoring[s]?.comment ?? ''}
                        onChange={(e) => onComment(s, e.target.value)}
                      />
                    </Field>
                  </Fields>
                )}
              </div>
            ))}
          </Rows>
        ) : (
          <Empty
            icon="◔"
            action={
              <Btn variant="ghost" small onClick={onGoToAssignment}>
                Go to assignment
              </Btn>
            }
          >
            Nobody is assigned yet, so there is nothing to rate.
          </Empty>
        )}

        {rateable.length ? (
          <Inline className="cb" wrap gap={9} align={false} style={{ borderTop: '1px solid var(--hair)' }}>
            <Btn
              disabled={!mayQc || !ready}
              title={
                !mayQc
                  ? 'Your account cannot enter ratings'
                  : ready
                    ? undefined
                    : 'Score every criterion for each person you are rating first'
              }
              onClick={onSave}
            >
              Save ratings
            </Btn>
            <Btn variant="ghost" onClick={onDefect}>
              Log a defect instead
            </Btn>
            <span
              className="gr"
              style={{ fontSize: 'var(--t-small)', marginLeft: 'auto', alignSelf: 'center' }}
            >
              A defect attaches to the field and page — that is what feeds the rulebook.
            </span>
          </Inline>
        ) : null}
      </Card>
    </>
  )
}
