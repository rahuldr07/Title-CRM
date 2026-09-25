import { useStageName } from '@/domain/company/naming'
import type { CSSProperties } from 'react'
import { useGo } from '@/shared/hooks/useGo'
import { Avatar } from './Avatar'
import { Banner } from './Banner'
import { Card, Label } from './Card'
import { Rows } from './DetailList'
import {
  aboutOther,
  whenWord,
  wishFor,
  wishIcon,
  wishNote,
  type Celebration,
} from '@/domain/people/celebrations'
import { fmtDate } from '@/shared/lib/format'

export function YourWish({
  celebrations,
  firstName,
}: {
  celebrations: Celebration[]
  firstName: string
}) {
  if (!celebrations.length) return null

  return (
    <>
      {celebrations.map((c) => (
        <Banner
          key={`${c.person.id}-${c.kind}`}
          kind="v"
          icon={wishIcon(c)}
          title={wishFor(c)}
        >
          {wishNote(c, firstName)}
        </Banner>
      ))}
    </>
  )
}

export function TeamWishes({
  celebrations,
  title = 'Birthdays and anniversaries',
  empty = 'Nothing in the next few days.',
  style,
}: {
  celebrations: Celebration[]
  title?: string
  empty?: string
  style?: CSSProperties
}) {
  const navigate = useGo()
  const stageName = useStageName()
  const today = celebrations.filter((c) => c.inDays === 0)
  const soon = celebrations.filter((c) => c.inDays > 0)

  return (
    <Card padded style={style ?? {}}>
      <Label>{title}</Label>

      {celebrations.length ? (
        <Rows bare>
          {[...today, ...soon].map((c) => (
            <button
              key={`${c.person.id}-${c.kind}`}
              type="button"
              className="rw"
              style={{ width: '100%', textAlign: 'left' }}
              title={`Open ${c.person.n}`}
              onClick={() =>
                navigate({ to: '/staff/$personId', params: { personId: c.person.id } })
              }
            >
              <span>
                <Avatar name={c.person.n} />
              </span>
              <span>
                <b style={{ fontSize: 'var(--t-body)' }}>
                  {wishIcon(c)} {aboutOther(c)}
                </b>
                <div className="sd gr">
                  {c.person.dep.map(stageName).join(', ') || 'No department'} · {fmtDate(c.at)}
                </div>
              </span>
              <span>
                <span className={c.inDays === 0 ? 'ok' : 'gr'} style={{ fontSize: 'var(--t-small)' }}>
                  {whenWord(c.inDays)}
                </span>
              </span>
            </button>
          ))}
        </Rows>
      ) : (
        <p className="gr" style={{ fontSize: 'var(--t-small)', margin: 0 }}>
          {empty}
        </p>
      )}

      {today.length ? (
        <p className="gr" style={{ fontSize: 'var(--t-small)', marginTop: 12 }}>
          {today.length === 1 ? 'This one is today' : `${today.length} of these are today`} — worth a
          word before the day goes.
        </p>
      ) : null}
    </Card>
  )
}
