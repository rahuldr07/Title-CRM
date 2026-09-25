import { useStageName } from '@/domain/company/naming'
import type { Dispatch, SetStateAction } from 'react'
import { ASSIGN_STAGES } from '@/data/org'
import { PRODUCTS } from '@/data/catalog'
import { EVERYSTATE, stateName } from '@/domain/assignment/qualification'
import { ruleThen, ruleWhen, type RuleDraft } from '@/domain/assignment/ruleText'
import type { Person } from '@/data/types'
import { Field, Fields } from '@/shared/ui/Form'
import { Input, Select } from '@/shared/ui/Controls'
import { Pill } from '@/shared/ui/Button'
import { Inline, Note } from '@/shared/ui/Layout'
import { withCond } from './ruleDraft'

export function RuleEditor({
  draft,
  setDraft,
  locked,
  hits,
  orders,
  problem,
  everyone,
}: {
  draft: RuleDraft
  setDraft: Dispatch<SetStateAction<RuleDraft>>
  locked: boolean | undefined
  hits: number
  orders: number
  problem: string | null
  everyone: Person[]
}) {
  const stageName = useStageName()
  const noCond = !Object.keys(draft.cond).length
  const noPool = draft.k !== 'block' && !draft.pool.length
  const setCond = (k: 'stage' | 'product' | 'state', v: string) => setDraft((d) => withCond(d, k, v))

  return (
    <>
      <Fields>
        <Field label="Name" wide>
          <Input
            field
            id="ru-n"
            value={draft.n}
            placeholder="e.g. Alaska searches to the courthouse pair"
            onChange={(e) => setDraft((d) => ({ ...d, n: e.target.value }))}
          />
        </Field>
        <Field label="What it does">
          <Select
            field
            id="ru-k"
            disabled={locked}
            value={draft.k}
            onChange={(v) => setDraft((d) => ({ ...d, k: v }))}
            options={[
              ['route', 'Routes — only these people may take it'],
              ['block', 'Blocks — nobody may take it'],
              ['prefer', 'Prefers — pick these first'],
            ]}
          />
        </Field>
        <Field label="Active">
          <Select
            field
            id="ru-o"
            disabled={locked}
            value={draft.on ? 'on' : 'off'}
            onChange={(v) => setDraft((d) => ({ ...d, on: v !== 'off' }))}
            options={[
              ['on', 'On'],
              ['off', 'Off'],
            ]}
          />
        </Field>
      </Fields>

      <div className="lb" style={{ marginTop: 18 }}>
        When an order matches all of these
      </div>
      <Note margin="0 0 10px">
        Leave one as <b>any</b> to ignore it. This is the condition the engine runs — not a
        description of one.
      </Note>
      <Fields>
        <Field label="Stage">
          <Select
            field
            id="ru-st"
            value={draft.cond.stage ?? ''}
            onChange={(v) => setCond('stage', v)}
            options={[['', 'any stage'], ...ASSIGN_STAGES.map((x) => [x, stageName(x)] as const)]}
          />
        </Field>
        <Field label="Product">
          <Select
            field
            id="ru-pr"
            value={draft.cond.product ?? ''}
            onChange={(v) => setCond('product', v)}
            options={[['', 'any product'], ...PRODUCTS.map((x) => [x.id, x.id] as const)]}
          />
        </Field>
        <Field label="State">
          <Select
            field
            id="ru-sta"
            value={draft.cond.state ?? ''}
            onChange={(v) => setCond('state', v)}
            options={[['', 'any state'], ...EVERYSTATE().map((x) => [x, `${x} — ${stateName(x)}`] as const)]}
          />
        </Field>
      </Fields>

      {draft.k !== 'block' ? (
        <div style={{ marginTop: 18 }}>
          <div className="lb">Who it routes to</div>
          <Note margin="0 0 10px">
            Tick the people this rule allows. Narrowing it to nobody is how an order ends up with
            nowhere to go.
          </Note>
          <Inline wrap gap={6} align={false}>
            {everyone.filter((x) => x.dep.length && x.active !== false).map((p) => {
              const picked = draft.pool.includes(p.id)
              return (
                <Pill
                  key={p.id}
                  on={picked}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      pool: picked ? d.pool.filter((x) => x !== p.id) : [...d.pool, p.id],
                    }))
                  }
                >
                  {p.n}
                </Pill>
              )
            })}
          </Inline>
        </div>
      ) : null}

      <div className={`bnr ${noPool ? 'd' : noCond ? 'r' : 'n'}`} style={{ marginTop: 18 }}>
        <span className="bi">·</span>
        <div>
          <b>
            When {ruleWhen({ cond: draft.cond })} → {ruleThen({ k: draft.k, pool: draft.pool })}
          </b>
          <div className="bs">
            {noCond ? <b>No condition set, so this matches every order. </b> : null}
            Matches <b>{hits.toLocaleString()}</b> of today’s {orders.toLocaleString()}{' '}
            orders.{' '}
            {noPool ? (
              <b>Nobody is ticked — every match would become an exception.</b>
            ) : null}
          </div>
        </div>
      </div>

      {problem ? (
        <div className="bnr r" style={{ margin: '14px 0 0' }}>
          <span className="bi">⚠</span>
          <div>{problem}</div>
        </div>
      ) : null}

      {locked ? (
        <div className="bnr r" style={{ margin: '14px 0 0' }}>
          <span className="bi">🔒</span>
          <div style={{ fontSize: 'var(--t-small)' }}>
            <div className="bt" style={{ fontSize: 'var(--t-small)' }}>
              This rule cannot be switched off or retyped
            </div>
            {draft.k === 'prefer'
              ? 'Something has to decide between two equally eligible people.'
              : 'Assigning outside a department, or letting somebody check their own work, are the two things this system must never do.'}
          </div>
        </div>
      ) : null}

      <div className="bnr b" style={{ margin: '14px 0 0' }}>
        <span className="bi">◷</span>
        <div style={{ fontSize: 'var(--t-small)' }}>
          <div className="bt" style={{ fontSize: 'var(--t-small)' }}>
            Applies to new orders only
          </div>
          Changing a rule does not move work already in somebody’s queue. A dry run shows what it
          would do first.
        </div>
      </div>
    </>
  )
}
