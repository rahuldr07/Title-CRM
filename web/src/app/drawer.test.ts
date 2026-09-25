import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { drawerOf, OFF_CANVAS } from './drawer'

describe('the navigation drawer', () => {
  it('keeps the sidebar and the page both reachable at desktop width, whatever the toggle says', () => {
    for (const navOpen of [false, true]) {
      const d = drawerOf(false, navOpen)
      expect(d.open).toBe(false)
      expect(d.sideInert).toBe(false)
      expect(d.mainInert).toBe(false)
    }
  })

  it('takes the off-canvas sidebar out of reach while it is closed', () => {
    expect(drawerOf(true, false)).toEqual({
      open: false,
      sideInert: true,
      mainInert: false,
      burgerLabel: 'Open navigation',
    })
  })

  it('takes the page behind out of reach while it is open, and says the burger closes it', () => {
    expect(drawerOf(true, true)).toEqual({
      open: true,
      sideInert: false,
      mainInert: true,
      burgerLabel: 'Close navigation',
    })
  })

  it('goes off canvas at exactly the width the stylesheet moves the sidebar off screen', () => {
    const css = readFileSync(new URL('../styles/design.css', import.meta.url), 'utf8')
    const at = css.indexOf('transform: translateX(-100%)')
    const media = css.lastIndexOf('@media', at)
    expect(at).toBeGreaterThan(-1)
    expect(css.slice(media, css.indexOf('{', media)).trim()).toBe(`@media ${OFF_CANVAS}`)
  })
})
