import { useCallback, useEffect, useRef } from 'react'
import { useSession } from '@/domain/auth/SessionProvider'
import { useUi } from '@/shared/ui/UiProvider'
import { useMediaQuery } from '@/shared/hooks/useMediaQuery'
import { focusablesIn, nextFocus } from '@/shared/ui/focusTrap'
import { drawerOf, OFF_CANVAS } from './drawer'

export function useDrawer() {
  const { navOpen, setNavOpen } = useSession()
  const { modal } = useUi()
  const offCanvas = useMediaQuery(OFF_CANVAS)
  const side = useRef<HTMLElement>(null)
  const burger = useRef<HTMLButtonElement>(null)
  const refocus = useRef(false)
  const drawer = drawerOf(offCanvas, navOpen)
  const trapping = drawer.open && modal === null

  const close = useCallback(() => {
    refocus.current = true
    setNavOpen(false)
  }, [setNavOpen])

  const toggle = useCallback(() => {
    if (navOpen) close()
    else setNavOpen(true)
  }, [navOpen, close, setNavOpen])

  useEffect(() => {
    if (!offCanvas && navOpen) setNavOpen(false)
  }, [offCanvas, navOpen, setNavOpen])

  useEffect(() => {
    if (drawer.open || !refocus.current) return
    refocus.current = false
    burger.current?.focus()
  }, [drawer.open])

  useEffect(() => {
    if (!trapping) return
    const box = side.current
    if (box && !box.contains(document.activeElement)) (focusablesIn(box)[0] ?? box).focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
      if (e.key !== 'Tab' || !box) return
      const list = focusablesIn(box)
      const at = nextFocus(list.length, list.indexOf(document.activeElement as HTMLElement), e.shiftKey)
      const target = list[at] ?? box
      e.preventDefault()
      target.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [trapping, close])

  return { drawer, side, burger, close, toggle }
}
