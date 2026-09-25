import { describe, expect, it } from 'vitest'
import { tabAfterKey } from './tabKeys'

describe('moving between tabs from the keyboard', () => {
  it('goes to the next tab on the right arrow and wraps from the last to the first', () => {
    expect(tabAfterKey('ArrowRight', 0, 4)).toBe(1)
    expect(tabAfterKey('ArrowRight', 3, 4)).toBe(0)
  })

  it('goes to the previous tab on the left arrow and wraps from the first to the last', () => {
    expect(tabAfterKey('ArrowLeft', 2, 4)).toBe(1)
    expect(tabAfterKey('ArrowLeft', 0, 4)).toBe(3)
  })

  it('jumps to the first tab on Home and the last on End', () => {
    expect(tabAfterKey('Home', 2, 4)).toBe(0)
    expect(tabAfterKey('End', 1, 4)).toBe(3)
  })

  it('leaves every other key to the page', () => {
    for (const k of ['Enter', ' ', 'Tab', 'ArrowUp', 'ArrowDown', 'a']) expect(tabAfterKey(k, 1, 4)).toBeNull()
  })

  it('starts from the first tab when none is selected', () => {
    expect(tabAfterKey('ArrowRight', -1, 3)).toBe(1)
    expect(tabAfterKey('ArrowLeft', -1, 3)).toBe(2)
  })

  it('does nothing when there are no tabs', () => {
    expect(tabAfterKey('ArrowRight', 0, 0)).toBeNull()
  })
})
