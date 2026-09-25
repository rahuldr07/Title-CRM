import type { RefObject } from 'react'
import { useGo } from '@/shared/hooks/useGo'
import { useSession } from '@/domain/auth/SessionProvider'
import { fmtTime, initials, toIst, TZ, TZ2 } from '@/shared/lib/format'
import { now } from '@/shared/lib/clock'
import { DEMO_IDENTITY } from '@/shared/lib/demo'
import { ROUTE_LABEL } from '@/shared/lib/navMenu'
import { useNotifications } from './useNotifications'
import { SIDENAV_ID, type Drawer } from './drawer'
import { Btn, IconButton } from '@/shared/ui/Button'

export function TopBar({
  current,
  drawer,
  burger,
  onToggle,
}: {
  current: string
  drawer: Drawer
  burger: RefObject<HTMLButtonElement | null>
  onToggle: () => void
}) {
  const { me, tenant, theme, toggleTheme, roleLabel, can } = useSession()
  const navigate = useGo()
  const { list, open: openAlerts } = useNotifications()

  const worst = list.some((a) => a.sev === 'bad') ? 'var(--bad)' : 'var(--warn)'
  const label = ROUTE_LABEL[current]
  const crumb = label ? `${tenant.name} · ${label}` : tenant.name

  const hasDash = can('all')
  const target = hasDash ? '/dash' : '/mywork'
  const targetLabel = hasDash ? 'dashboard' : 'my work'
  const atTarget = target === `/${current}`

  return (
    <header className="top">
      <IconButton
        className="ic burger"
        ref={burger}
        label={drawer.burgerLabel}
        aria-expanded={drawer.open}
        aria-controls={SIDENAV_ID}
        onClick={onToggle}
      >
        ☰
      </IconButton>

      {atTarget ? null : (
        <Btn
          variant="ghost"
          small
          className="backbtn"
          aria-label={`Back to ${targetLabel}`}
          title={`Back to ${targetLabel}`}
          onClick={() => navigate({ to: target })}
        >
          ←<span className="lbl">{hasDash ? 'Dashboard' : 'My work'}</span>
        </Btn>
      )}

      <span className="gr crumb" style={{ fontSize: 'var(--t-small)' }} title={crumb}>
        {crumb}
      </span>

      <div className="clock">
        <b>
          {fmtTime(now())} {TZ}
        </b>{' '}
        <span>
          · {fmtTime(toIst(now()))} {TZ2}
        </span>
      </div>

      <IconButton
        className="ic"
        label={
          list.length ? `Notifications — ${list.length} need attention` : 'Notifications — nothing outstanding'
        }
        onClick={openAlerts}
      >
        🔔
        {list.length ? <span className="dot" style={{ background: worst }} /> : null}
      </IconButton>

      <IconButton
        className="ic"
        label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-pressed={theme === 'dark'}
        onClick={toggleTheme}
      >
        ◐
      </IconButton>

      <IconButton
        className="who"
        label={DEMO_IDENTITY ? 'Account — switch who you are signed in as' : 'Account'}
        onClick={() => navigate({ to: '/signin' })}
      >
        <span className="ava" style={{ width: 26, height: 26, fontSize: 'var(--t-mini)' }}>
          {initials(me.n)}
        </span>
        <span className="who-id">
          <b>{me.n}</b>
          <span className="gr">{roleLabel}</span>
        </span>
      </IconButton>
    </header>
  )
}
