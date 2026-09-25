import { useStageName } from '@/domain/company/naming'
import { Avatar } from '@/shared/ui/Avatar'
import { Btn } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Field } from '@/shared/ui/Form'
import { Select } from '@/shared/ui/Controls'
import { Inline, Note } from '@/shared/ui/Layout'
import { Rows } from '@/shared/ui/DetailList'
import { useUi } from '@/shared/ui/UiProvider'
import { useGo } from '@/shared/hooks/useGo'
import type { useLevels } from '@/domain/assignment/levels'
import { COVSTAGES } from '@/data/org'
import type { Level, Person } from '@/data/types'
import { levelBadge } from './levelsText'

export function LevelPeople({
  lv,
  level,
  held,
  eligible,
  ungraded,
}: {
  lv: ReturnType<typeof useLevels>
  level: Level
  held: Person[]
  eligible: Person[]
  ungraded: Person[]
}) {
  const navigate = useGo()
  const { toast } = useUi()
  const stageName = useStageName()
  const { levels, onLevel, levelSentence, personLevel } = lv

  return (
    <>
      <Card padded top={16}>
        <Inline gap={12} wrap>
          <div className="lb" style={{ margin: 0 }}>
            Who is on {level.n}
          </div>
          <Inline gap={8} style={{ marginLeft: 'auto' }}>
            <Field layout="bare" label="Add somebody" className="gr" style={{ fontSize: 'var(--t-label)' }}>
              <Select<string>
                field
                id="lv-add"
                style={{ minWidth: 200 }}
                value=""
                onChange={(v) => v && toast(lv.setPersonLevel(v, level.id))}
                options={[
                  ['', '— choose —'],
                  ...eligible
                    .filter((x) => personLevel(x.id) !== level.id)
                    .map((x) => {
                      const cur = personLevel(x.id)
                      return [x.id, `${x.n} — ${cur ? (levels.find((l) => l.id === cur)?.n ?? '') : 'no level'}`] as const
                    }),
                ]}
              />
            </Field>
          </Inline>
        </Inline>
        <Inline wrap gap={8} align={false} style={{ marginTop: 13 }}>
          {held.length ? (
            held.map((x) => (
              <span
                key={x.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  border: '1px solid var(--hair)',
                  borderRadius: 99,
                  padding: '5px 6px 5px 5px',
                  background: 'var(--tint)',
                }}
              >
                <Avatar
                  name={x.n}
                  title={`Open ${x.n}`}
                  style={{ width: 24, height: 24, fontSize: 'var(--t-mini)' }}
                  onClick={() => navigate({ to: '/staff/$personId', params: { personId: x.id } })}
                />
                <b style={{ fontSize: 'var(--t-small)' }}>{x.n}</b>
                <Btn
                  variant="ghost"
                  small
                  style={{ padding: '1px 7px' }}
                  title={`Take ${x.n} off ${level.n}`}
                  onClick={() => toast(lv.setPersonLevel(x.id, ''))}
                >
                  ×
                </Btn>
              </span>
            ))
          ) : (
            <span className="gr" style={{ fontSize: 'var(--t-body)' }}>
              Nobody yet — add someone above.
            </span>
          )}
        </Inline>
        {ungraded.length ? (
          <Note top={14}>
            <b>{ungraded.length} not on any level:</b> {ungraded.map((x) => x.n).join(', ')} — they are unrestricted
            until you put them on one.
          </Note>
        ) : null}
      </Card>

      <Card padded top={16}>
        <div className="lb">The whole ladder</div>
        <div style={{ marginTop: 8 }}>
          <Rows>
            {levels.map((l) => (
              <div className="rw" key={l.id}>
                <span className="ava">{levelBadge(l.n)}</span>
                <span>
                  <b>{l.n}</b>
                  <div className="sd gr">{levelSentence(l)}</div>
                </span>
                <span className="mono gr">{onLevel(l.id).length}</span>
              </div>
            ))}
          </Rows>
        </div>
        <Note top={12}>
          Levels govern <b>{COVSTAGES.map(stageName).join(' and ')}</b> only — the stages where local knowledge is what is being
          bought. Typing and {stageName('RTS')} work from what the searcher found.
        </Note>
      </Card>
    </>
  )
}
