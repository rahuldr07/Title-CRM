import { describe, expect, it } from 'vitest'
import { underPromised } from './slaRules'
import type { Product } from '@/data/types'

const P = (id: string, h: number): Product => ({ id, n: id, fee: 0, h })

describe('products promised faster than they take', () => {
  const sla = [{ cl: 'MGR', pr: 'FS', h: 72 }, { cl: '— (default)', pr: 'Any', h: 24 }]

  it('are the ones slower than the fallback with no rule of their own', () => {
    expect(underPromised(sla, [P('FS', 72), P('LIEN', 8), P('TWO', 48), P('DAY', 24)]).map((p) => p.id)).toEqual(['TWO'])
  })

  it('are none when every slow product has a rule', () => {
    expect(underPromised(sla, [P('FS', 72)])).toEqual([])
  })
})
