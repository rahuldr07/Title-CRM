import { describe, expect, it } from 'vitest'
import { nextFocus } from './focusTrap'

describe('where Tab goes inside a dialog', () => {
  it('moves forward one control at a time', () => {
    expect(nextFocus(4, 0, false)).toBe(1)
    expect(nextFocus(4, 2, false)).toBe(3)
  })

  it('wraps from the last control to the first', () => {
    expect(nextFocus(4, 3, false)).toBe(0)
  })

  it('moves back on Shift+Tab, and wraps from the first to the last', () => {
    expect(nextFocus(4, 2, true)).toBe(1)
    expect(nextFocus(4, 0, true)).toBe(3)
  })

  it('starts at an end when focus is on none of the controls', () => {
    expect(nextFocus(4, -1, false)).toBe(0)
    expect(nextFocus(4, -1, true)).toBe(3)
  })

  it('stays on the only control', () => {
    expect(nextFocus(1, 0, false)).toBe(0)
    expect(nextFocus(1, 0, true)).toBe(0)
  })

  it('has nowhere to go when there is nothing to focus', () => {
    expect(nextFocus(0, -1, false)).toBe(-1)
    expect(nextFocus(0, -1, true)).toBe(-1)
  })
})
