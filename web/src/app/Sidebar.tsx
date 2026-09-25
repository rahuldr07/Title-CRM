import type { Ref } from 'react'
import { useGo } from '@/shared/hooks/useGo'
import { useSession } from '@/domain/auth/SessionProvider'
import { useUi } from '@/shared/ui/UiProvider'
import { visibleNav } from '@/domain/auth/permissions'
import { initials } from '@/shared/lib/format'
import { usePastDueCount } from '@/domain/orders/orderCounts'
import { useBrokenLinks } from '@/domain/counties/links'
import { followUpCount, useLeads } from '@/domain/leads/leads'
import { useWorkspaces } from '@/domain/company/company'
import { Chip } from '@/shared/ui/Chip'
import { Row, Rows } from '@/shared/ui/DetailList'
import { pressable } from '@/shared/ui/pressable'
import { IconButton } from '@/shared/ui/Button'
import { Anchor } from '@/shared/ui/Anchor'
import { SIDENAV_ID, type Drawer } from './drawer'
import { navBadge } from './badges'
import { Note } from '@/shared/ui/Layout'

export function Sidebar({
  current,
  drawer,
  ref,
  onClose,
}: {
  current: string
  drawer: Drawer
  ref: Ref<HTMLElement>
  onClose: () => void
}) {
  const { me, tenant, switchTenant, roleLabel, setNavOpen, memberships } = useSession()
  const seeded = useWorkspaces()
  const leads = useLeads()
  const counts = { overdue: usePastDueCount(), followUps: followUpCount(leads), brokenLinks: useBrokenLinks().length }
  const { openModal, closeModal } = useUi()
  const navigate = useGo()

  const groups = visibleNav(me)

  const go = (route: string) => {
    setNavOpen(false)
    navigate({ to: `/${route}` })
  }

  const workspaces = memberships.length
    ? memberships.map((m) => ({ id: m.id, name: m.name, plan: m.plan }))
    : seeded.map((t) => ({ id: t.id, name: t.name, plan: t.plan }))

  const openTenantPicker = () =>
    openModal({
      title: 'Switch company',
      body: (
        <>
          <Note bottom={14}>
            Each company is a separate workspace. Staff, orders, clients, counties and quality data are
            private to it — nothing is shared between companies.
          </Note>
          <Rows>
            {workspaces.map((t) =>
              t.id === 'new' ? (
                <Row
                  key={t.id}
                  icon={<span className="br">＋</span>}
                  title={<span className="br">Add a company</span>}
                  detail="Set up a new workspace"
                  onClick={() => {
                    closeModal()
                    go('onboard')
                  }}
                />
              ) : (
                <Row
                  key={t.id}
                  icon={<span className="ava">{initials(t.name)}</span>}
                  title={t.name}
                  detail={t.plan}
                  right={t.id === tenant.id ? <Chip kind="b">Current</Chip> : null}
                  onClick={() => {
                    switchTenant(t.id)
                    closeModal()
                    go('dash')
                  }}
                />
              ),
            )}
          </Rows>
        </>
      ),
    })

  return (
    <aside
      className="side"
      id={SIDENAV_ID}
      ref={ref}
      tabIndex={-1}
      inert={drawer.sideInert}
    >
      <div className="logo">
        <i>◧</i> Title CRM
        {drawer.open ? (
          <IconButton className="navclose" label="Close navigation" onClick={onClose}>
            ×
          </IconButton>
        ) : null}
      </div>

      <div
        className="tenant"
        {...pressable(openTenantPicker)}
      >
        <span className="av">{initials(tenant.name)}</span>
        <span className="nm">
          <b>{tenant.name}</b>
          <span>{tenant.plan}</span>
        </span>
        <span className="cx">⇅</span>
      </div>

      <nav>
        {groups.map((g) => (
          <div key={g.l}>
            <div className="navlbl">{g.l}</div>
            {g.t.map(([label, route, glyph]) => {
              const badge = navBadge(route, counts)
              return (
                <Anchor
                  key={route}
                  href={`/${route}`}
                  className={route === current ? 'on' : ''}
                  aria-current={route === current ? 'page' : undefined}
                  onClick={(e) => {
                    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
                    e.preventDefault()
                    go(route)
                  }}
                >
                  <i>{glyph}</i>
                  {label}
                  {badge ? (
                    <span className="bdg" style={badge.warn ? { background: 'var(--warn)' } : undefined}>
                      {badge.n}
                    </span>
                  ) : null}
                </Anchor>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="me">
        <span className="av">{initials(me.n)}</span>
        <span>
          <b>{me.n}</b>
          <span>{roleLabel}</span>
        </span>
        <IconButton className="lo" label="Sign out" title="Sign out" onClick={() => go('signin')}>
          ⏻
        </IconButton>
      </div>
    </aside>
  )
}
