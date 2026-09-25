import { useStageName } from '@/domain/company/naming'
import { BarRow } from '@/shared/ui/Bar'
import { Card, Label } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { SectionHead } from '@/shared/ui/PageHead'
import { QC_CRITERIA, QC_SCALE, type StageWork } from '@/domain/quality/quality'
import { hh } from '@/domain/assignment/sla'
import type { QcEntry } from '@/data/quality'
import { Cell, FlexRow, FlexTable } from '@/shared/ui/FlexTable'
import { ShowAll } from '@/shared/ui/ShowAll'
import { useCappedList } from '@/shared/hooks/useCappedList'
import { fmtDate } from '@/shared/lib/format'
import { Inline, Note } from '@/shared/ui/Layout'

const scaleWord = (v: number) => QC_SCALE.find((q) => q[0] === v)?.[1] ?? ''

export function QcDefects({ defects }: { defects: QcEntry[] }) {
  const stageName = useStageName()
  const list = [...defects].sort((a, b) => b.d.getTime() - a.d.getTime())
  const shown = useCappedList(list, { keyOf: (x) => `${x.order}-${x.stage}-${x.d.getTime()}` })

  const byCrit = list.reduce<Record<string, number>>((acc, x) => {
    const failed = QC_CRITERIA.filter(([, field]) => x[field] <= 3).map(([name]) => name)
    for (const c of failed.length ? failed : ['Accuracy']) acc[c] = (acc[c] ?? 0) + 1
    return acc
  }, {})

  return (
    <>
      <SectionHead>
        What the {list.length} defect{list.length === 1 ? ' was' : 's were'}
      </SectionHead>

      {Object.keys(byCrit).length ? (
        <Card padded bottom={14}>
          <Label>By criterion</Label>
          <Inline align={false} gap={9} wrap style={{ marginTop: 9 }}>
            {Object.entries(byCrit)
              .sort((a, b) => b[1] - a[1])
              .map(([c, n]) => (
                <Chip key={c} kind={n > 1 ? 'd' : 'r'}>
                  {c} · {n}
                </Chip>
              ))}
          </Inline>
        </Card>
      ) : null}

      <Card>
        <div className="tb">
          {shown.shown.map((x, i) => {
            const failed = QC_CRITERIA.filter(([, field]) => x[field] <= 3)
            const severe = x.acc <= 2 || x.comp <= 2 || x.fmt <= 2
            return (
              <FlexRow key={`${x.order}-${x.stage}-${i}`} whole style={{ padding: '15px 16px' }}>
                <Cell style={{ display: 'block' }}>
                  <Inline align="flex-start" gap={12} wrap>
                    <span className={severe ? 'bad' : 'warn'} style={{ fontSize: 'var(--t-h3)', lineHeight: 1.2 }}>
                      ⚑
                    </span>
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div style={{ fontSize: 'var(--t-body)', fontWeight: 650, marginBottom: 3 }}>
                        {x.note || 'No reason was recorded'}
                      </div>
                      <div className="gr" style={{ fontSize: 'var(--t-small)' }}>
                        {failed.map(([name, field], j) => (
                          <span key={name}>
                            {j ? ' · ' : ''}
                            <b className={x[field] <= 2 ? 'bad' : 'warn'}>
                              {name} scored {x[field]} — {scaleWord(x[field])}
                            </b>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 210 }}>
                      <div className="mono" style={{ fontSize: 'var(--t-small)' }}>
                        {x.order}
                      </div>
                      <div className="gr" style={{ fontSize: 'var(--t-label)' }}>
                        {x.cl} · {x.pr} · {stageName(x.stage)}
                      </div>
                      <div className="gr" style={{ fontSize: 'var(--t-label)' }}>
                        {fmtDate(x.d)} · rated by {x.byName}
                      </div>
                    </div>
                  </Inline>
                  <Inline align={false} gap={16} style={{ marginTop: 11, paddingTop: 11, borderTop: '1px solid var(--hair)', fontSize: 'var(--t-small)' }}>
                    {QC_CRITERIA.map(([name, field]) => (
                      <span className="gr" key={name}>
                        {name}
                        <b
                          className={`mono ${x[field] <= 2 ? 'bad' : x[field] <= 3 ? 'warn' : 'ok'}`}
                          style={{ marginLeft: 5 }}
                        >
                          {x[field]}
                        </b>
                      </span>
                    ))}
                  </Inline>
                </Cell>
              </FlexRow>
            )
          })}
        </div>
      </Card>
      <ShowAll list={shown} noun="defects" />

      <Note top={10}>
        A defect is any criterion scored 3 or below. The bold line is what the rater wrote — that,
        not the number, is the thing worth acting on.
      </Note>
    </>
  )
}

const OVER_COLS = '40px 120px 165px 130px 105px 105px 1fr'

export function QcOverBudget({ work, lateOnly }: { work: StageWork; lateOnly: boolean }) {
  const stageName = useStageName()
  const items = work.items
    .filter((x) => x.over && (!lateOnly || x.d.late))
    .sort((a, b) => b.ratio - a.ratio)
  const onTime = items.filter((x) => !x.d.late).length
  const shown = useCappedList(items)

  return (
    <>
      <SectionHead>
        {lateOnly
          ? `The ${items.length} late deliver${items.length === 1 ? 'y' : 'ies'} their stage overran on`
          : `The ${items.length} stage${items.length === 1 ? '' : 's'} that went over budget`}
      </SectionHead>

      <FlexTable
        cols={OVER_COLS}
        min={860}
        head={['#', 'Delivered', 'Order', 'Stage', 'Took', 'Budget', 'How far over']}
      >
        {shown.shown.map((x, i) => (
          <FlexRow key={`${x.d.id}-${x.st}-${i}`}>
            <Cell>
              <div className="gr mono" style={{ fontSize: 'var(--t-label)' }}>
                {i + 1}
              </div>
            </Cell>
            <Cell>
              <div className="v mono" style={{ fontSize: 'var(--t-small)' }}>
                {fmtDate(x.d.d)}
              </div>
            </Cell>
            <Cell>
              <div className="v mono" style={{ fontSize: 'var(--t-small)' }}>
                {x.d.id}
              </div>
              <div className="s">
                {x.d.cl} · {x.d.pr} · {x.d.slaH}h promise
              </div>
              {x.d.late ? (
                <div className="s bad">delivered late</div>
              ) : (
                <div className="s ok">still delivered on time</div>
              )}
            </Cell>
            <Cell>
              <div className="v" style={{ fontSize: 'var(--t-small)' }}>
                {stageName(x.st)}
              </div>
            </Cell>
            <Cell>
              <div className="v mono warn">{hh(x.h)}</div>
            </Cell>
            <Cell>
              <div className="v mono gr">{hh(x.budget)}</div>
            </Cell>
            <Cell>
              <div className={`v mono ${x.ratio > 2 ? 'bad' : 'warn'}`}>
                {x.ratio.toFixed(2)}× · +{hh(x.h - x.budget)}
              </div>
            </Cell>
          </FlexRow>
        ))}
      </FlexTable>
      <ShowAll list={shown} noun="overruns" />

      <Note top={10}>
        Worst first.{' '}
        {lateOnly
          ? 'These are the ones nothing absorbed.'
          : `${onTime} of these still went out on time — the buffer and the other departments absorbed them. That is why this list is longer than the one beside it.`}
      </Note>
    </>
  )
}

const SPREAD = {
  person: { cols: '118px 1fr 62px', gap: 11, pad: '5px 0' },
  team: { cols: '150px 1fr 120px', gap: 12, pad: '6px 0' },
} as const

export function MarkSpread({ marks, mode }: { marks: number[]; mode: keyof typeof SPREAD }) {
  const { cols, gap, pad } = SPREAD[mode]

  return (
    <>
      {[5, 4, 3, 2, 1].map((v) => {
        const n = marks.filter((m) => m === v).length
        const scale = QC_SCALE.find((q) => q[0] === v)
        return (
          <BarRow
            key={v}
            cols={cols}
            gap={gap}
            padding={pad}
            labelClass=""
            label={
              <Chip kind={scale?.[2] ?? 'n'}>
                {v} · {scale?.[1] ?? ''}
              </Chip>
            }
            value={n}
            max={marks.length}
            color={v >= 4 ? 'var(--ok)' : 'var(--warn)'}
            rightClass="mono gr"
            right={
              mode === 'team'
                ? `${n.toLocaleString()} · ${marks.length ? ((n / marks.length) * 100).toFixed(1) : '0.0'}%`
                : n || '—'
            }
          />
        )
      })}
    </>
  )
}

export function QcMarks({ ratings }: { ratings: QcEntry[] }) {
  const all = ratings.flatMap((x) => [x.acc, x.comp, x.fmt])

  return (
    <Card padded>
      <Label>Spread of individual marks</Label>
      <Note margin="6px 0 12px">
        {all.length} criterion marks across {ratings.length} ratings.
      </Note>
      <MarkSpread marks={all} mode="person" />
      <Note top={12}>
        Counted per criterion rather than per rating, so a single order can contribute a 5 and a 3.
      </Note>
    </Card>
  )
}
