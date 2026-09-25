export const activates = (key: string): boolean => key === 'Enter' || key === ' '

const CONTROL = 'a,button,input,select,textarea,label,[role=button],[role=link]'

interface Closest {
  closest?: (selector: string) => unknown
}

export const fromInnerControl = (target: unknown, currentTarget: unknown): boolean => {
  if (target === currentTarget) return false
  const hit = (target as Closest | null)?.closest?.(CONTROL) ?? null
  return hit !== null && hit !== currentTarget
}

interface Press {
  target: unknown
  currentTarget: unknown
}

interface KeyPress extends Press {
  key: string
  preventDefault(): void
}

export interface Pressable {
  role: 'button'
  tabIndex: 0
  onClick: (e: Press) => void
  onKeyDown: (e: KeyPress) => void
}

export function pressable(onActivate: () => void): Pressable {
  return {
    role: 'button',
    tabIndex: 0,
    onClick: (e) => {
      if (fromInnerControl(e.target, e.currentTarget)) return
      onActivate()
    },
    onKeyDown: (e) => {
      if (e.target !== e.currentTarget || !activates(e.key)) return
      if (e.key === ' ') e.preventDefault()
      onActivate()
    },
  }
}
