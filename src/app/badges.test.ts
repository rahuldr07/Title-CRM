import { describe, expect, it } from 'vitest'
import { navBadge } from './badges'

const counts = { overdue: 3, followUps: 2, brokenLinks: 5 }

describe('the badge beside a menu item', () => {
  it('shows each count on its own route', () => {
    expect(navBadge('dash', counts)).toEqual({ n: 3, warn: false })
    expect(navBadge('leads', counts)).toEqual({ n: 2, warn: true })
    expect(navBadge('linkcheck', counts)).toEqual({ n: 5, warn: false })
  })

  it('shows nothing when the count is zero or the route has none', () => {
    expect(navBadge('dash', { ...counts, overdue: 0 })).toBeNull()
    expect(navBadge('orders', counts)).toBeNull()
  })
})
