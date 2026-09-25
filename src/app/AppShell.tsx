import { useEffect, useRef } from 'react'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useUi } from '@/shared/ui/UiProvider'
import { useSession } from '@/domain/auth/SessionProvider'
import { RequireAuth } from './RequireAuth'
import { TenantScope } from './TenantScope'
import { focusablesIn, nextFocus } from '@/shared/ui/focusTrap'
import { useDrawer } from './useDrawer'
import { IconButton } from '@/shared/ui/Button'
import { Anchor } from '@/shared/ui/Anchor'
import { useTitlePart } from '@/shared/hooks/useTitlePart'

const routeIdOf = (pathname: string) => pathname.split('/').filter(Boolean)[0] ?? 'dash'

function Modal() {
  const { modal, closeModal } = useUi()
  const open = modal !== null
  const dialog = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    return () => {
      returnFocus.current?.focus()
    }
  }, [open])

  useEffect(() => {
    const box = dialog.current
    if (!modal || !box || box.contains(document.activeElement)) return
    const body = box.querySelector<HTMLElement>('.mb')
    const first = (body && focusablesIn(body)[0]) ?? box
    first.focus()
  }, [modal])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal()
        return
      }
      const box = dialog.current
      if (e.key !== 'Tab' || !box) return
      const list = focusablesIn(box)
      const at = nextFocus(list.length, list.indexOf(document.activeElement as HTMLElement), e.shiftKey)
      const target = list[at] ?? box
      e.preventDefault()
      target.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, closeModal])

  return (
    <div
      className={`mask${modal ? ' on' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal()
      }}
    >
      {modal ? (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="mdt" tabIndex={-1} ref={dialog}>
          <div className="mh">
            <h3 id="mdt">{modal.title}</h3>
            <IconButton className="x" onClick={closeModal} label="Close">
              ×
            </IconButton>
          </div>
          <div className="mb">{modal.body}</div>
          {modal.footer ? <div className="mf">{modal.footer}</div> : null}
        </div>
      ) : null}
    </div>
  )
}

function Toast() {
  const { toastText } = useUi()
  return (
    <div id="toast" className={toastText ? 'on' : ''} role="status" aria-live="polite">
      {toastText}
    </div>
  )
}

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const current = routeIdOf(pathname)
  const { authState, setNavOpen, tenant } = useSession()
  const main = useRef<HTMLElement>(null)
  const { drawer, side, burger, close, toggle } = useDrawer()

  const shown = useRef(pathname)
  const arrived = useRef(false)

  useEffect(() => {
    window.scrollTo(0, 0)
    setNavOpen(false)
    if (shown.current !== pathname) {
      shown.current = pathname
      arrived.current = true
    }
    const el = main.current
    if (!el) return
    el.classList.remove('anim')
    void el.offsetWidth
    el.classList.add('anim')
  }, [pathname, setNavOpen])

  useEffect(() => {
    const el = main.current
    if (!arrived.current || drawer.mainInert || !el) return
    arrived.current = false
    if (!el.contains(document.activeElement)) el.focus({ preventScroll: true })
  }, [pathname, drawer.mainInert])

  const signedIn = authState === 'authenticated' || authState === 'demo'
  useTitlePart('workspace', signedIn ? tenant.name : undefined)

  return (
    <RequireAuth>
      {signedIn ? (
        <div className="app">
          <Anchor
            href="#main"
            className="skip"
            onClick={(e) => {
              e.preventDefault()
              main.current?.focus()
            }}
          >
            Skip to content
          </Anchor>
          <Sidebar current={current} drawer={drawer} ref={side} onClose={close} />
          {drawer.open ? <div className="scrim" aria-hidden="true" onClick={close} /> : null}
          <div className="main" inert={drawer.mainInert}>
            <TopBar current={current} drawer={drawer} burger={burger} onToggle={toggle} />
            <main className="wrap anim" id="main" ref={main} tabIndex={-1}>
              <TenantScope>
                <Outlet />
              </TenantScope>
            </main>
          </div>
        </div>
      ) : (
        <div className="authshell">
          <main className="wrap" id="main" ref={main} tabIndex={-1}>
            <Outlet />
          </main>
        </div>
      )}
      <Modal />
      <Toast />
    </RequireAuth>
  )
}
