import { Card, Label } from '@/shared/ui/Card'
import { Field } from '@/shared/ui/Form'
import { Seg } from '@/shared/ui/Tabs'
import { ENGINEOPTS } from '@/data/org'
import type { EngineConfig } from '@/data/types'

export function EngineSettings({
  engine,
  onPick,
}: {
  engine: EngineConfig
  onPick: <K extends keyof EngineConfig>(k: K, v: EngineConfig[K]) => void
}) {
  return (
    <Card padded>
      <Label>When the engine runs</Label>
      <div style={{ display: 'grid', gap: 14 }}>
        {(
          [
            ['trigger', 'Trigger'],
            ['commit', 'Commit'],
            ['onChange', 'If a rule changes'],
          ] as [keyof EngineConfig, string][]
        ).map(([k, label]) => {
          const opts = ENGINEOPTS[k]
          const cur = opts.find((o) => o[0] === engine[k]) ?? opts[0]
          return (
            <Field key={k} as="group" id={`eg-${k}`} label={label}>
              <Seg<string>
                value={engine[k]}
                onChange={(v) => onPick(k, v as EngineConfig[typeof k])}
                options={opts.map((o) => [o[0], o[1]] as const)}
              />
              <div className="hint">{cur?.[2]}</div>
            </Field>
          )
        })}
        {engine.trigger !== 'arrival' || engine.commit !== 'auto' ? (
          <div className="bnr r" style={{ margin: 0 }}>
            <span className="bi">⚑</span>
            <div>
              <b>The board still shows placement on arrival.</b> The setting is saved; the board
              models placement on arrival only, and drawing the others would be inventing a
              result.
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  )
}
