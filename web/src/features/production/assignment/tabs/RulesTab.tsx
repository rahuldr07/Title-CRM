import { useCallback, useEffect, useRef, useState } from 'react'
import { Btn } from '@/shared/ui/Button'
import { Card, Label } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { Rows } from '@/shared/ui/DetailList'
import { useUi } from '@/shared/ui/UiProvider'
import { useRules } from '@/domain/assignment/RulesProvider'
import { placementOf } from '@/domain/orders/orders'
import type { AssignmentBoard } from '@/domain/assignment/engine'
import { RULE_KIND, canRemove, ruleEffectParts, ruleProblem, ruleThen, ruleWhen, type RuleDraft } from '@/domain/assignment/ruleText'
import type { Rule } from '@/data/types'
import { useStaff } from '@/domain/people/roster'
import { DryRunResult } from '@/features/production/assignment/DryRunResult'
import { EngineSettings } from '@/features/production/assignment/EngineSettings'
import { RuleEditor } from '@/features/production/assignment/RuleEditor'
import { RuleHistory } from '@/features/production/assignment/RuleHistory'
import { blankRule, draftHits, draftOf } from '@/features/production/assignment/ruleDraft'
import { Note } from '@/shared/ui/Layout'

export function RulesTab({ board, onTab }: { board: AssignmentBoard; onTab: (t: 'Levels') => void }) {
  const everyone = useStaff()
  const { modal, openModal, closeModal, toast } = useUi()
  const { rules, engine, setEngine, toggle, save, remove, dryRun } = useRules()
  const { run } = board

  const [editing, setEditing] = useState<{ id: string | null } | null>(null)
  const [draft, setDraft] = useState<RuleDraft>(blankRule)
  const [problem, setProblem] = useState<string | null>(null)
  const [reshow, setReshow] = useState(0)

  const on = rules.filter((r) => r.on).length

  const showDryRun = useCallback(
    (d?: RuleDraft) => {
      const r = dryRun(d)
      const { placed: live, open: liveExc } = placementOf(run)
      openModal({
        title: d?.n ? `Dry run — ${d.n}, not saved` : 'Dry run — nothing was changed',
        body: <DryRunResult r={r} live={live} liveExc={liveExc} today={run.today.length} />,
        footer: d ? (
          <>
            <Btn variant="ghost" onClick={() => setReshow((n) => n + 1)}>
              Back to the rule
            </Btn>
            <Btn
              onClick={() => {
                setEditing(null)
                closeModal()
              }}
            >
              Close
            </Btn>
          </>
        ) : (
          <Btn onClick={closeModal}>Close</Btn>
        ),
      })
    },
    [dryRun, openModal, closeModal, run],
  )

  const ruleHistory = () =>
    openModal({
      title: 'Rule change history',
      body: <RuleHistory rules={rules} fired={run.fired} />,
      footer: <Btn onClick={closeModal}>Close</Btn>,
    })

  const startEdit = (r?: Rule) => {
    setProblem(null)
    setDraft(r ? draftOf(r) : blankRule())
    setEditing({ id: r?.id ?? null })
  }

  const stopEdit = useCallback(() => {
    setEditing(null)
    closeModal()
  }, [closeModal])

  const commit = useCallback(() => {
    const bad = ruleProblem(draft, rules, editing?.id ?? null)
    if (bad) return setProblem(bad)
    const refused = save(draft, editing?.id ?? null)
    if (refused) return setProblem(refused)
    toast(editing?.id ? `${draft.n.trim()} saved` : `${draft.n.trim()} added`)
    stopEdit()
  }, [draft, rules, editing, save, toast, stopEdit])

  const actions = useRef({ commit, stopEdit, showDryRun })
  useEffect(() => {
    actions.current = { commit, stopEdit, showDryRun }
  })

  useEffect(() => {
    if (!editing) return
    const locked = editing.id ? rules.find((r) => r.id === editing.id)?.lock : false
    const hits = draftHits(run.orders, draft.cond)

    openModal({
      title: editing.id ? `Edit rule — ${rules.find((r) => r.id === editing.id)?.n ?? ''}` : 'New rule',
      body: (
        <RuleEditor
          draft={draft}
          setDraft={setDraft}
          locked={locked}
          hits={hits}
          orders={run.orders.length}
          problem={problem}
          everyone={everyone}
        />
      ),
      footer: (
        <>
          <Btn variant="ghost" onClick={() => actions.current.stopEdit()}>
            Cancel
          </Btn>
          <Btn variant="ghost" onClick={() => actions.current.showDryRun(draft)}>
            Dry run
          </Btn>
          <Btn onClick={() => actions.current.commit()}>
            {editing.id ? 'Save rule' : 'Create rule'}
          </Btn>
        </>
      ),
    })
  }, [editing, draft, problem, rules, run, openModal, reshow, everyone])

  const [seen, setSeen] = useState(modal)
  if (seen !== modal) {
    setSeen(modal)
    if (seen !== null && modal === null && editing) setEditing(null)
  }

  return (
    <>
      <div className="bnr b">
        <span className="bi">⚙</span>
        <div>
          <div className="bt">Applied in order, top to bottom — each one narrows what is left</div>
          {Object.entries(RULE_KIND).map(([k, v], i) => (
            <span key={k}>
              {i ? ' · ' : ''}
              <Chip kind={v[1]}>{v[0]}</Chip> {v[2]}
            </span>
          ))}
        </div>
        <div className="ba">
          <Btn onClick={() => startEdit()}>＋ Add rule</Btn>
        </div>
      </div>

      <Card top={16}>
        <div className="ch">
          <h2>Rules</h2>
          <div className="r gr" style={{ fontSize: 'var(--t-small)' }}>
            {on} of {rules.length} on
          </div>
        </div>
        <Rows bare>
          {rules.map((r, i) => {
            const kind = RULE_KIND[r.k] ?? RULE_KIND.prefer
            return (
              <div className="rw" key={r.id} style={r.on ? undefined : { opacity: 0.55 }}>
                <span className="mono gr" style={{ width: 16, textAlign: 'right' }}>
                  {i + 1}
                </span>
                <span>
                  <b>{r.n}</b> <Chip kind={kind[1]}>{kind[0]}</Chip>
                  {r.lock ? (
                    <>
                      {' '}
                      <Chip>Locked</Chip>
                    </>
                  ) : null}
                  {r.on ? null : (
                    <>
                      {' '}
                      <Chip>Off</Chip>
                    </>
                  )}
                  <div className="sd">
                    When <b>{ruleWhen(r)}</b> → {ruleThen(r)}
                  </div>
                  <div className="sd gr">
                    {(() => {
                      const [before, em, after] = ruleEffectParts(
                        r,
                        run.fired[r.id] ?? 0,
                        run.narrowed[r.id],
                      )
                      return (
                        <>
                          {before}
                          {em ? <b>{em}</b> : null}
                          {after}
                        </>
                      )
                    })()}
                  </div>
                </span>
                <span style={{ display: 'flex', gap: 6, whiteSpace: 'nowrap' }}>
                  <Btn
                    variant="ghost"
                    small
                    onClick={() => (r.k === 'cover' ? onTab('Levels') : startEdit(r))}
                  >
                    {r.k === 'cover' ? 'Levels' : 'Edit'}
                  </Btn>
                  {r.lock ? null : (
                    <Btn variant="ghost" small onClick={() => {
                      const refused = toggle(r.id)
                      if (refused) toast(refused)
                    }}>
                      {r.on ? 'Turn off' : 'Turn on'}
                    </Btn>
                  )}
                  {canRemove(r) ? (
                    <Btn
                      variant="ghost"
                      small
                      title={`Remove ${r.n}`}
                      aria-label={`Remove ${r.n}`}
                      onClick={() => {
                        toast(remove(r.id) ?? `${r.n} removed`)
                      }}
                    >
                      ×
                    </Btn>
                  ) : null}
                </span>
              </div>
            )
          })}
        </Rows>
        <div className="cb">
          <Note margin={0}>
            <b>Department membership</b> and <b>self-review</b> cannot be switched off — doing so would
            let the system do something it should never do. <b>Fill the emptiest first</b> is locked for
            a different reason: there has to be some way to choose between two equally eligible people.
          </Note>
        </div>
      </Card>

      <div className="two" style={{ marginTop: 18 }}>
        <EngineSettings engine={engine} onPick={(k, v) => toast(setEngine(k, v))} />

        <Card padded>
          <Label>Test a change before it goes live</Label>
          <Note>
            Run the current rules against today’s {run.today.length} orders and see what would move.
          </Note>
          <Btn style={{ width: '100%', marginTop: 12 }} onClick={() => showDryRun()}>
            Dry run against today
          </Btn>
          <Btn variant="ghost" style={{ width: '100%', marginTop: 8 }} onClick={ruleHistory}>
            Rule change history
          </Btn>
          <Note top={12}>
            A dry run never touches anyone’s queue. It reports what the rules <i>would</i> have done.
          </Note>
        </Card>
      </div>
    </>
  )
}
