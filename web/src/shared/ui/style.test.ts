import { describe, expect, it } from 'vitest'
import { cx, space, spaced, textStyle } from './style'

describe('cx', () => {
  it('joins the parts that are set, in order', () => {
    expect(cx('inp', 'mono')).toBe('inp mono')
    expect(cx('pill', false, 'on')).toBe('pill on')
  })

  it('drops empty, false, null and undefined parts', () => {
    expect(cx('fld', '', null, undefined, false)).toBe('fld')
    expect(cx()).toBe('')
  })
})

describe('space', () => {
  it('writes only the sides that were asked for', () => {
    expect(space({ top: 12 })).toEqual({ marginTop: 12 })
    expect(space({})).toEqual({})
  })

  it('puts the shorthand before the sides, so a side still wins', () => {
    expect(Object.keys(space({ margin: 0, top: 12, bottom: 4 }))).toEqual(['margin', 'marginTop', 'marginBottom'])
  })

  it('keeps a zero and a shorthand string', () => {
    expect(space({ margin: 0 })).toEqual({ margin: 0 })
    expect(space({ margin: '14px 0 0' })).toEqual({ margin: '14px 0 0' })
  })
})

describe('spaced', () => {
  it('is undefined when nothing is set, so no empty style attribute renders', () => {
    expect(spaced({})).toBeUndefined()
  })

  it('lets an explicit style follow the spacing', () => {
    expect(spaced({ top: 16 }, { maxWidth: 560 })).toEqual({ marginTop: 16, maxWidth: 560 })
  })
})

describe('textStyle', () => {
  it('reads the size from the type scale, then the spacing', () => {
    expect(textStyle('small', { top: 10 })).toEqual({ fontSize: 'var(--t-small)', marginTop: 10 })
    expect(Object.keys(textStyle('body', { margin: 0 }))).toEqual(['fontSize', 'margin'])
  })
})
