export const OFF_CANVAS = '(max-width: 820px)'

export const SIDENAV_ID = 'sidenav'

export interface Drawer {
  open: boolean
  sideInert: boolean
  mainInert: boolean
  burgerLabel: string
}

export const drawerOf = (offCanvas: boolean, navOpen: boolean): Drawer => {
  const open = offCanvas && navOpen
  return {
    open,
    sideInert: offCanvas && !open,
    mainInert: open,
    burgerLabel: open ? 'Close navigation' : 'Open navigation',
  }
}
