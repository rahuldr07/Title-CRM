import { useStageName } from '@/domain/company/naming'
import { Banner } from '@/shared/ui/Banner'
import { Btn } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { AVAIL } from '@/data/people'
import type { Person } from '@/data/types'
import type { standing } from '@/domain/quality/quality'
import { initials, labelOf } from '@/shared/lib/format'
import { roleName } from '@/domain/auth/permissions'
import { Inline } from '@/shared/ui/Layout'

export function PersonHead({
  person,
  sd,
  dis,
  isMe,
  showRoles,
  onEdit,
  onRoles,
}: {
  person: Person
  sd: ReturnType<typeof standing> | null
  dis: boolean
  isMe: boolean
  showRoles: boolean
  onEdit: (() => void) | undefined
  onRoles: () => void
}) {
  const stageName = useStageName()
  return (
    <Card padded>
      <div className="ch" style={{ border: 'none', padding: 0 }}>
        <Inline gap={14} style={{ minWidth: 0 }}>
          <span className="ava" style={{ width: 52, height: 52, fontSize: 'var(--t-h3)' }}>
            {initials(person.n)}
          </span>
          <div style={{ minWidth: 0 }}>
            <Inline wrap gap={9}>
              <h2 style={{ margin: 0, fontSize: 'var(--t-h2)' }}>{person.n}</h2>
              <Chip kind={person.r === 'admin' ? 'b' : person.r === 'staff' ? 'n' : 'r'}>
                {roleName(person.r)}
              </Chip>
              {dis ? (
                <Chip kind="n">Disabled</Chip>
              ) : (
                <Chip kind={labelOf(AVAIL, person.avail)[1]}>{labelOf(AVAIL, person.avail)[0]}</Chip>
              )}
              {sd ? <Chip kind={sd[1]}>{sd[0]}</Chip> : null}
              {isMe ? <Chip kind="b">You</Chip> : null}
            </Inline>
            <div className="gr" style={{ fontSize: 'var(--t-small)', marginTop: 4 }}>
              {person.dep.length ? (
                person.dep.map(stageName).join(' · ')
              ) : (
                <span className="warn">in no department — cannot be assigned anything</span>
              )}
              {person.e ? (
                <>
                  {' · '}
                  <span className="mono" style={{ overflowWrap: 'anywhere' }}>
                    {person.e}
                  </span>
                </>
              ) : null}
              {person.mob ? (
                <>
                  {' · '}
                  <span className="mono">{person.mob}</span>
                </>
              ) : null}
            </div>
          </div>
        </Inline>
        <div className="r">
          {onEdit ? (
            <Btn variant="ghost" onClick={onEdit}>
              Edit details
            </Btn>
          ) : (
            <span style={{ fontSize: 'var(--t-small)' }}>Changing this record needs the “people” capability.</span>
          )}
          {showRoles ? (
            <Btn variant="ghost" onClick={onRoles}>
              Roles
            </Btn>
          ) : null}
        </div>
      </div>

      {person.conflict ? (
        <Banner kind="r" icon="⚖" title="In a stage and its own QC" margin="14px 0 0">
          {person.n} is in both Typing and {stageName('Typing QC')}, so they could be asked to check their own
          typing. Assignment blocks it order by order, but the pairing itself is worth a decision.
        </Banner>
      ) : null}

      {dis ? (
        <Banner kind="d" icon="⚑" title="Disabled — takes no new work" margin="14px 0 0">
          Their history stays exactly as it is. Everything below still counts the work they did.
        </Banner>
      ) : null}
    </Card>
  )
}
