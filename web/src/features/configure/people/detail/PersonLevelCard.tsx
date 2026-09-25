import { useStageName } from '@/domain/company/naming'
import { Btn } from '@/shared/ui/Button'
import { Card, Label } from '@/shared/ui/Card'
import { Field } from '@/shared/ui/Form'
import { Select } from '@/shared/ui/Controls'
import type { Person } from '@/data/types'
import { COVSTAGES } from '@/data/org'
import type { useLevels } from '@/domain/assignment/levels'
import { covWord } from '@/domain/assignment/qualification'
import { Note } from '@/shared/ui/Layout'

export function PersonLevelCard({
  person,
  levelsApi,
  onOpenLevel,
}: {
  person: Person
  levelsApi: ReturnType<typeof useLevels>
  onOpenLevel: ((levelId: string) => void) | undefined
}) {
  const stageName = useStageName()
  const level = levelsApi.levelOf(person.id)
  const levelId = levelsApi.personLevel(person.id)
  return (
    <Card padded>
      <Label>What they can be given</Label>
      <div style={{ marginTop: 10 }}>
        <Field
          label="Level"
          hint={
            levelsApi.readOnly ??
            (levelId
              ? 'Coverage comes from the level, so changing it here moves them, not the level.'
              : 'Not restricted — a candidate for anything in their department.')
          }
        >
          <Select
            field
            value={levelId ?? ''}
            disabled={!!levelsApi.readOnly}
            onChange={(v) => levelsApi.setPersonLevel(person.id, v)}
            options={[
              ['', 'No level — takes anything'] as const,
              ...levelsApi.levels.map((l) => [l.id, `${l.n} — ${covWord(l)}`] as const),
            ]}
          />
        </Field>
      </div>
      {levelId && level ? (
        <div className="rw" style={{ padding: '11px 0', marginTop: 6 }}>
          <span className="ok" style={{ fontSize: 'var(--t-lead)' }}>
            ◈
          </span>
          <span>
            <b>{covWord(levelsApi.covOf(person.id))}</b>
            <div className="sd">
              Shared with {Math.max(0, levelsApi.onLevel(levelId).length - 1)} other
              {levelsApi.onLevel(levelId).length - 1 === 1 ? '' : 's'} on {level.n}. Widen the
              level and they all move together.
            </div>
          </span>
          {onOpenLevel ? (
            <span>
              <Btn variant="ghost" small onClick={() => onOpenLevel(levelId)}>
                Open the level
              </Btn>
            </span>
          ) : null}
        </div>
      ) : null}
      <Note top={10}>
        Levels apply to {COVSTAGES.map(stageName).join(' and ')} only — the stages that need local knowledge.
        Typing and {stageName('RTS')} work from what the searcher found.
      </Note>
    </Card>
  )
}
