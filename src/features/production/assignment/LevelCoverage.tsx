import { useStageName } from '@/domain/company/naming'
import { Avatar } from '@/shared/ui/Avatar'
import { Banner } from '@/shared/ui/Banner'
import { Btn, Pill } from '@/shared/ui/Button'
import { Field, Fields } from '@/shared/ui/Form'
import { Input, Select } from '@/shared/ui/Controls'
import { Inline, Note } from '@/shared/ui/Layout'
import { Card } from '@/shared/ui/Card'
import { Rows } from '@/shared/ui/DetailList'
import { useUi } from '@/shared/ui/UiProvider'
import type { useLevels } from '@/domain/assignment/levels'
import { EVERYSTATE, stateName } from '@/domain/assignment/qualification'
import { PRODUCTS } from '@/data/catalog'
import type { Level, Person } from '@/data/types'
import { AddCountyForm } from '@/features/production/assignment/forms/AddCountyForm'
import { countiesShown, onLevelSentence } from './levelsText'

function PillRow({
  label,
  count,
  total,
  onAll,
  onNone,
  children,
}: {
  label: string
  count: number
  total: number
  onAll: () => void
  onNone: () => void
  children: React.ReactNode
}) {
  return (
    <div style={{ marginTop: 20 }}>
      <Inline align="baseline" gap={10} style={{ marginBottom: 9 }}>
        <div className="lb" style={{ margin: 0 }}>
          {label}
        </div>
        <span className="gr" style={{ fontSize: 'var(--t-label)' }}>
          {count} of {total}
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Btn variant="ghost" small disabled={count === total} title={count === total ? 'Already all of them' : undefined} onClick={onAll}>
            All
          </Btn>
          <Btn variant="ghost" small disabled={count === 0} title={count === 0 ? 'Already none' : undefined} onClick={onNone}>
            None
          </Btn>
        </span>
      </Inline>
      <Inline wrap gap={6} align={false}>
        {children}
      </Inline>
    </div>
  )
}

export function LevelCoverage({
  lv,
  level,
  prodsOn,
  chosenStates,
  rest,
  shownStates,
  held,
}: {
  lv: ReturnType<typeof useLevels>
  level: Level
  prodsOn: number
  chosenStates: string[]
  rest: string[]
  shownStates: string[]
  held: Person[]
}) {
  const { openModal, closeModal, toast } = useUi()
  const stageName = useStageName()
  const { setCov, setCounty, countiesIn, levelSentence } = lv

  return (
    <Card padded>
      <Fields>
        <Field label="Level name">
          <Input
            field
            id="lv-n"
            defaultValue={level.n}
            key={`n-${level.id}`}
            onBlur={(e) => lv.rename(level.id, e.target.value)}
          />
        </Field>
        <Field label="What it means">
          <Input
            field
            id="lv-note"
            defaultValue={level.note ?? ''}
            key={`note-${level.id}`}
            placeholder="Learning — the counties they have been shown"
            onBlur={(e) => lv.setNote(level.id, e.target.value)}
          />
        </Field>
      </Fields>

      <PillRow
        label="Products"
        count={prodsOn}
        total={PRODUCTS.length}
        onAll={() => setCov(level.id, 'allproducts')}
        onNone={() => setCov(level.id, 'noproducts')}
      >
        {PRODUCTS.map((pr) => {
          const on = level.products === 'all' || level.products.includes(pr.id)
          return (
            <Pill key={pr.id} on={on} title={pr.n} onClick={() => setCov(level.id, 'product', pr.id)}>
              {pr.id}
            </Pill>
          )
        })}
      </PillRow>

      <div style={{ marginTop: 20 }}>
        <Inline align="baseline" gap={10} wrap style={{ marginBottom: 9 }}>
          <div className="lb" style={{ margin: 0 }}>
            States
          </div>
          <span className="gr" style={{ fontSize: 'var(--t-label)' }}>
            {level.states === 'all' ? 'every state' : `${chosenStates.length} of ${EVERYSTATE().length}`}
          </span>
          <span style={{ marginLeft: 'auto', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <Select<string>
              label={`Add a state to ${level.n}`}
              style={{ minWidth: 170, fontSize: 'var(--t-small)' }}
              value=""
              disabled={!rest.length}
              onChange={(v) => v && setCov(level.id, 'addstate', v)}
              options={[
                ['', rest.length ? '＋ Add a state…' : 'every state already'],
                ...rest.map(
                  (st) =>
                    [
                      st,
                      `${st} — ${stateName(st)}${countiesIn(st).length ? ` (${countiesIn(st).length} counties on file)` : ''}`,
                    ] as const,
                ),
              ]}
            />
            <Btn
              variant="ghost"
              small
              disabled={level.states === 'all'}
              title={level.states === 'all' ? 'Already every state' : undefined}
              onClick={() => setCov(level.id, 'allstates')}
            >
              All
            </Btn>
            <Btn
              variant="ghost"
              small
              disabled={!chosenStates.length}
              title={!chosenStates.length ? 'Already none' : undefined}
              onClick={() => setCov(level.id, 'nostates')}
            >
              None
            </Btn>
          </span>
        </Inline>
        <Inline wrap gap={6} align={false}>
          {level.states === 'all' ? (
            <span className="gr" style={{ fontSize: 'var(--t-body)' }}>
              Every state in the country — including any you have not taken work in yet.
            </span>
          ) : chosenStates.length ? (
            chosenStates.map((st) => (
              <Pill key={st} on title={`Remove ${stateName(st)}`} onClick={() => setCov(level.id, 'state', st)}>
                {st} ×
              </Pill>
            ))
          ) : (
            <span className="gr" style={{ fontSize: 'var(--t-body)' }}>
              No states yet — add one above.
            </span>
          )}
        </Inline>
      </div>

      {shownStates.length ? (
        <div style={{ marginTop: 20 }}>
          <Inline align="baseline" gap={10} style={{ marginBottom: 4 }}>
            <div className="lb" style={{ margin: 0 }}>
              Counties
            </div>
            <span className="gr" style={{ fontSize: 'var(--t-label)' }}>
              a state with none unticked means the whole state
            </span>
          </Inline>
          {shownStates.map((st) => {
            const named = level.counties?.[st] ?? []
            const have = countiesIn(st)
            return (
              <div key={st} className="covrow">
                <span className="covrow-st">
                  <b className="mono" style={{ fontSize: 'var(--t-small)' }}>
                    {st}
                  </b>
                  <span className="gr" style={{ fontSize: 'var(--t-label)' }}>
                    {' '}
                    {stateName(st)}
                  </span>
                </span>
                <div className="covrow-cos">
                  {have.map((co) => {
                    const on = !named.length || named.includes(co)
                    return (
                      <Pill key={co} on={on} onClick={() => setCounty(level.id, st, co)}>
                        {co}
                      </Pill>
                    )
                  })}
                  {have.length ? null : (
                    <span className="gr" style={{ fontSize: 'var(--t-small)' }}>
                      No counties on file — this level covers the whole state.
                    </span>
                  )}
                  <Btn
                    variant="ghost"
                    small
                    title={`Add a county in ${stateName(st)}`}
                    onClick={() =>
                      openModal({
                        title: `Add a county in ${stateName(st)}`,
                        body: (
                          <AddCountyForm
                            st={st}
                            onDone={(msg) => {
                              closeModal()
                              toast(msg)
                            }}
                          />
                        ),
                      })
                    }
                  >
                    ＋ County
                  </Btn>
                </div>
                <span className="gr covrow-n">
                  {countiesShown(have.length, named.length)}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <Note top={16}>
          Add a state above to choose counties within it.
        </Note>
      )}

      <Banner
        kind={prodsOn && shownStates.length ? 'n' : 'd'}
        icon={prodsOn && shownStates.length ? '·' : '⚑'}
        top={20}
        actions={
          <Btn
            variant="ghost"
            small
            onClick={() => {
              const r = lv.remove(level.id)
              if (r.ok) return toast(`${level.n} removed`)
              openModal({
                title: `${level.n} is in use`,
                body: (
                  <>
                    <Rows>
                      {r.held.map((p) => (
                        <div className="rw" key={p.id}>
                          <Avatar name={p.n} />
                          <span>
                            <b>{p.n}</b>
                            <div className="sd">{p.dep.map(stageName).join(', ')}</div>
                          </span>
                          <span className="gr" style={{ fontSize: 'var(--t-small)' }}>
                            on this level
                          </span>
                        </div>
                      ))}
                    </Rows>
                    <Note top={14}>
                      Move these people to another level first. Removing a level out from under somebody would
                      silently widen what they can be given, which is the one change nobody would notice.
                    </Note>
                  </>
                ),
              })
            }}
          >
            Delete level
          </Btn>
        }
      >
        <b>{levelSentence(level)}</b>
        <div className="bs">
          {onLevelSentence(held.length)}
        </div>
      </Banner>
    </Card>
  )
}
