import { useStageName } from '@/domain/company/naming'
import { Btn, LinkButton } from '@/shared/ui/Button'
import { Card, Label } from '@/shared/ui/Card'
import { Chip } from '@/shared/ui/Chip'
import { Row, Rows } from '@/shared/ui/DetailList'
import { AVAIL } from '@/data/people'
import { ASSIGN_STAGES, STAGES } from '@/data/org'
import type { Perm, Person, Role } from '@/data/types'
import { labelOf } from '@/shared/lib/format'
import { roleName } from '@/domain/auth/permissions'
import { Inline, Note } from '@/shared/ui/Layout'

export function PersonAccessTab({
  person,
  role,
  perms,
  dis,
  onEdit,
  onRoles,
}: {
  person: Person
  role: Role | undefined
  perms: Perm[]
  dis: boolean
  onEdit: (() => void) | undefined
  onRoles: (() => void) | undefined
}) {
  const stageName = useStageName()
  const change = (label: string) =>
    onEdit ? (
      <Btn variant="ghost" small onClick={onEdit}>
        {label}
      </Btn>
    ) : undefined

  const held = role ? role.p : []

  return (
    <>
      <div className="two" style={{ marginTop: 16 }}>
        <Card padded>
          <Label>Role</Label>
          <Inline gap={10} style={{ margin: '8px 0 4px' }}>
            <Chip kind={person.r === 'admin' ? 'b' : person.r === 'staff' ? 'n' : 'r'}>
              {roleName(person.r)}
            </Chip>
            <span className="gr" style={{ fontSize: 'var(--t-small)' }}>
              {role ? role.desc : 'role no longer exists'}
            </span>
          </Inline>
          <Rows bare style={{ marginTop: 10 }}>
            {perms.map((x) => {
              const has = held.includes(x.k)
              return (
                <div className="rw" key={x.k}>
                  <span className={has ? 'ok' : 'gr'} style={{ fontSize: 'var(--t-body)' }}>
                    {has ? '✓' : '·'}
                  </span>
                  <span>
                    <b className={has ? '' : 'gr'}>{x.n}</b>
                    {x.never ? <div className="sd gr">nobody holds this</div> : null}
                  </span>
                  <span />
                </div>
              )
            })}
          </Rows>
          <Note top={12}>
            These come from the role, not from the person.{' '}
            {onRoles ? (
              <>
                Change them under{' '}
                <LinkButton onClick={onRoles}>Company → Roles</LinkButton>{' '}
                and everyone holding the role moves with it.
              </>
            ) : (
              'A company admin changes them under Company → Roles, and everyone holding the role moves with it.'
            )}
          </Note>
        </Card>

        <Card padded>
          <Label>Departments — what they can be assigned</Label>
          {STAGES.map((d) => {
            const inIt = person.dep.includes(d)
            return (
              <div className="rw" style={{ padding: '9px 0' }} key={d}>
                <span className={inIt ? 'ok' : 'gr'} style={{ fontSize: 'var(--t-body)' }}>
                  {inIt ? '✓' : '·'}
                </span>
                <span>
                  <b className={inIt ? '' : 'gr'}>{stageName(d)}</b>
                  <div className="sd gr">
                    {inIt
                      ? ASSIGN_STAGES.includes(d)
                        ? 'eligible for automatic assignment'
                        : 'assigned by hand when needed'
                      : 'not eligible'}
                  </div>
                </span>
                <span />
              </div>
            )
          })}
          <Note top={10}>
            Department decides what work can reach them; the role decides what they can see and do.
          </Note>
        </Card>
      </div>

      <Card padded top={16}>
        <Label>Account</Label>
        <Rows bare>
          <Row
            icon={<span className="gr">·</span>}
            title="Daily target"
            detail={`${person.cap} stages — the engine stops offering work at this number`}
            right={change('Change')}
          />
          <Row
            icon={<span className="gr">·</span>}
            title="Availability"
            detail={`${labelOf(AVAIL, person.avail)[0]}${
              person.avail !== 'ok' ? ' — the engine skips them entirely' : ''
            }`}
            right={change('Change')}
          />
          <Row
            icon={<span className={dis ? 'bad' : 'ok'}>{dis ? '⚑' : '✓'}</span>}
            title={dis ? 'Disabled' : 'Active'}
            detail={
              dis
                ? 'Takes no new work. History is kept.'
                : 'Counted in capacity and eligible for assignment.'
            }
            right={change(dis ? 'Re-enable' : 'Disable')}
          />
        </Rows>
        <Note top={12}>
          Disabling keeps every rating and every hour they worked. Deleting a person would silently
          rewrite the reports they appear in, which is why it is not offered.
          {onEdit ? null : ' Changing this record needs the “people” capability.'}
        </Note>
      </Card>
    </>
  )
}
