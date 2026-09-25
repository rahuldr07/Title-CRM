import { useStageName } from '@/domain/company/naming'
import { Avatar } from '@/shared/ui/Avatar'
import { Banner } from '@/shared/ui/Banner'
import { Btn, LinkButton } from '@/shared/ui/Button'
import { Select } from '@/shared/ui/Controls'
import { Card, CardHead } from '@/shared/ui/Card'
import { Rows } from '@/shared/ui/DetailList'
import type { Go } from '@/shared/hooks/useGo'
import { PAIRS, STAGES } from '@/data/org'
import { AVAIL } from '@/data/people'
import type { Assignments, Person } from '@/data/types'
import { whoName, findPerson } from '@/domain/people/roster'
import { wouldSelfReview } from '@/domain/assignment/narrow'
import { labelOf } from '@/shared/lib/format'

interface Props {
  assign: Assignments
  everyone: readonly Person[]
  locked: string | null
  navigate: Go
  onAssignAll: () => void
  onPick: (stage: string, value: string) => void
}

export function OrderAssignmentTab({ assign, everyone, locked, navigate, onAssignAll, onPick }: Props) {
  const stageName = useStageName()
  return (
    <>
      <Card>
        <CardHead
          title="Who owns each stage"
          actions={
            <Btn variant="ghost" small disabled={!!locked} aria-describedby={locked ? 'asg-locked' : undefined} onClick={onAssignAll}>
              Assign all
            </Btn>
          }
        />
        {locked ? (
          <p id="asg-locked" className="gr cb" style={{ fontSize: 'var(--t-small)', margin: 0 }}>
            {locked}
          </p>
        ) : null}
        <Rows bare>
          {STAGES.map((s) => {
            const a = assign[s]
            const person = a ? findPerson(everyone, a) : undefined
            const clash = !!person?.conflict && (s === 'Typing' || s === 'Typing QC')
            return (
              <div className="rw" key={s}>
                <span>
                  <Avatar
                    name={a ? whoName(a) : null}
                    self={clash}
                    title={a ? `Open ${whoName(a)}` : 'Unassigned'}
                    onClick={
                      a
                        ? () => navigate({ to: '/staff/$personId', params: { personId: a } })
                        : undefined
                    }
                  />
                </span>
                <span>
                  <b>{stageName(s)}</b>
                  <div className="sd">
                    {a ? (
                      <LinkButton onClick={() => navigate({ to: '/staff/$personId', params: { personId: a } })}>
                        {whoName(a)}
                      </LinkButton>
                    ) : (
                      'Unassigned'
                    )}
                    {clash ? (
                      <>
                        {' · '}
                        <span className="bad">also assigned to the paired QC stage</span>
                      </>
                    ) : null}
                  </div>
                </span>
                <span>
                  <Select<string>
                    style={{ minWidth: 170 }}
                    label={`Assign ${stageName(s)}`}
                    disabled={!!locked}
                    aria-describedby={locked ? 'asg-locked' : undefined}
                    value=""
                    onChange={(v) => onPick(s, v)}
                    options={[
                      ['', a ? whoName(a) : '— choose —'],
                      ...everyone
                        .filter((x) => x.dep.includes(s) && x.id !== a && x.active !== false)
                        .map(
                          (x) =>
                            [
                              x.id,
                              `${x.n}${x.avail !== 'ok' ? ` (${labelOf(AVAIL, x.avail)[0].toLowerCase()})` : ''}${
                                wouldSelfReview(assign, s, x.id) ? ` — did the ${stageName(PAIRS[s] ?? '')}` : ''
                              }`,
                            ] as const,
                        ),
                      ...(a ? [['__clear', '— unassign —'] as const] : []),
                    ]}
                  />
                </span>
              </div>
            )
          })}
        </Rows>
      </Card>

      <Banner kind="b" icon="⚑" title="Self-review is blocked" top={16}>
        A person cannot QC a stage they performed. Ashok S sits in both Typing and {stageName('Typing QC')}, so
        he is filtered out of the QC list on any order he typed.
        <div className="bs">Configured under Quality → Segregation of duties.</div>
      </Banner>
    </>
  )
}
