import { describe, expect, it, vi } from 'vitest'
import { activates, fromInnerControl, pressable } from './pressable'

const key = (k: string, nested = false) => {
  const self = {}
  return { key: k, target: nested ? {} : self, currentTarget: self, preventDefault: vi.fn() }
}

interface FakeNode {
  closest: (selector: string) => FakeNode | null
}

const node = (parent: FakeNode | null, control = false): FakeNode => {
  const self: FakeNode = {
    closest: (selector) => {
      expect(selector).toContain('button')
      return control ? self : (parent?.closest(selector) ?? null)
    },
  }
  return self
}

describe('what activates a hand-made button', () => {
  it('is Enter and Space, as on a real button', () => {
    expect(activates('Enter')).toBe(true)
    expect(activates(' ')).toBe(true)
  })

  it('is nothing else', () => {
    for (const k of ['Tab', 'Escape', 'ArrowDown', 'a', 'Spacebar', '']) expect(activates(k)).toBe(false)
  })
})

describe('a pressable element', () => {
  it('is announced as a button and reachable by Tab', () => {
    const p = pressable(() => undefined)
    expect(p.role).toBe('button')
    expect(p.tabIndex).toBe(0)
  })

  it('activates on a click on itself', () => {
    const go = vi.fn()
    const row = node(null)
    pressable(go).onClick({ target: row, currentTarget: row })
    expect(go).toHaveBeenCalledOnce()
  })

  it('activates on a click on plain text inside it', () => {
    const go = vi.fn()
    const row = node(null)
    const text = node(row)
    pressable(go).onClick({ target: text, currentTarget: row })
    expect(go).toHaveBeenCalledOnce()
  })

  it('leaves a click on a button inside it to that button', () => {
    const go = vi.fn()
    const row = node(null)
    const button = node(row, true)
    pressable(go).onClick({ target: button, currentTarget: row })
    expect(go).not.toHaveBeenCalled()
  })

  it('leaves a click on the label inside a nested link to that link', () => {
    const go = vi.fn()
    const row = node(null)
    const link = node(row, true)
    const words = node(link)
    pressable(go).onClick({ target: words, currentTarget: row })
    expect(go).not.toHaveBeenCalled()
  })

  it('activates on Enter without cancelling it', () => {
    const go = vi.fn()
    const e = key('Enter')
    pressable(go).onKeyDown(e)
    expect(go).toHaveBeenCalledOnce()
    expect(e.preventDefault).not.toHaveBeenCalled()
  })

  it('activates on Space and stops it scrolling the page', () => {
    const go = vi.fn()
    const e = key(' ')
    pressable(go).onKeyDown(e)
    expect(go).toHaveBeenCalledOnce()
    expect(e.preventDefault).toHaveBeenCalledOnce()
  })

  it('ignores other keys', () => {
    const go = vi.fn()
    const e = key('ArrowDown')
    pressable(go).onKeyDown(e)
    expect(go).not.toHaveBeenCalled()
    expect(e.preventDefault).not.toHaveBeenCalled()
  })

  it('leaves a key pressed on a control inside it to that control', () => {
    const go = vi.fn()
    const e = key('Enter', true)
    pressable(go).onKeyDown(e)
    expect(go).not.toHaveBeenCalled()
  })
})

describe('a click from a control inside a pressable element', () => {
  it('is recognised when the nearest control is not the element itself', () => {
    const row = node(null, true)
    const button = node(row, true)
    expect(fromInnerControl(button, row)).toBe(true)
  })

  it('is not, when the nearest control is the element itself', () => {
    const row = node(null, true)
    const text = node(row)
    expect(fromInnerControl(text, row)).toBe(false)
  })

  it('is not, when the target is the element', () => {
    const row = node(null, true)
    expect(fromInnerControl(row, row)).toBe(false)
  })

  it('is not, when nothing on the way up is a control', () => {
    const row = node(null)
    expect(fromInnerControl(node(node(row)), row)).toBe(false)
  })

  it('is not, for a target that cannot be searched', () => {
    expect(fromInnerControl({}, node(null))).toBe(false)
    expect(fromInnerControl(null, node(null))).toBe(false)
  })
})
