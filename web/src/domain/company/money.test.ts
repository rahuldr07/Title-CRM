import { describe, expect, it } from 'vitest'
import { inr, inr2 } from './money'

describe('a negative rupee amount', () => {
  it('puts a true minus in front of the rupee sign', () => {
    expect(inr(-1234)).toBe('−₹1,234')
    expect(inr2(-1234.5)).toBe('−₹1,234.50')
  })

  it('carries no hyphen a line could break after', () => {
    for (const s of [inr(-5), inr2(-5)]) expect(s).not.toContain('-')
  })
})

describe('a positive rupee amount', () => {
  it('is unchanged', () => {
    expect(inr(876006)).toBe('₹8,76,006')
  })
})
