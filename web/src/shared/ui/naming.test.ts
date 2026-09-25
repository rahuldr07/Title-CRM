import { describe, expect, it } from 'vitest'
import { OUTSIDE_FIELD, bindingOf, nameOf } from './naming'

describe('nameOf', () => {
  it('names a bare control by its label', () => {
    expect(nameOf({ label: 'Search counties' }, null)).toEqual({
      id: undefined,
      'aria-label': 'Search counties',
      'aria-labelledby': undefined,
      'aria-describedby': undefined,
      'aria-invalid': undefined,
    })
  })

  it('takes the id and hint from the Field it sits in', () => {
    expect(nameOf({ field: true }, { id: 'n-ad', describedBy: 'n-ad-hint' })).toMatchObject({
      id: 'n-ad',
      'aria-describedby': 'n-ad-hint',
    })
  })

  it('points a group at the Field label', () => {
    expect(nameOf({ field: true }, { labelId: 'eg-trigger' })['aria-labelledby']).toBe('eg-trigger')
  })

  it('keeps an id and description the control was given', () => {
    const got = nameOf({ field: true }, { id: 'auto', describedBy: 'auto-hint' }, { id: 'lc-e', describedBy: 'lc-locked' })
    expect(got.id).toBe('lc-e')
    expect(got['aria-describedby']).toBe('lc-locked')
  })

  it('ignores a surrounding Field when the control names itself', () => {
    expect(nameOf({ label: 'Minutes' }, { id: 'x' }).id).toBeUndefined()
  })

  it('marks a control invalid when its Field carries an error, or when told so itself', () => {
    expect(nameOf({ field: true }, { id: 'x', invalid: true })['aria-invalid']).toBe(true)
    expect(nameOf({ label: 'Amount' }, null, { invalid: true })['aria-invalid']).toBe(true)
    expect(nameOf({ label: 'Amount' }, null, { invalid: false })['aria-invalid']).toBeUndefined()
  })

  it('refuses a control marked field with no Field around it', () => {
    expect(() => nameOf({ field: true }, null)).toThrow(OUTSIDE_FIELD)
  })
})

describe('bindingOf', () => {
  it('hands a control the id its label points at, and the hint', () => {
    expect(bindingOf('control', false, 'n-ad', 'n-ad-hint')).toEqual({ id: 'n-ad', describedBy: 'n-ad-hint' })
  })

  it('hands a group the label id instead, since a label cannot point at a group', () => {
    expect(bindingOf('group', false, 'eg-trigger')).toEqual({ labelId: 'eg-trigger', describedBy: undefined })
  })

  it('points the control at the error as well as the hint, and marks it invalid', () => {
    expect(bindingOf('control', false, 'n-ad', 'n-ad-hint', 'err')).toEqual({
      id: 'n-ad',
      describedBy: 'n-ad-hint err',
      invalid: true,
    })
    expect(bindingOf('control', true, 'x', undefined, 'err')).toEqual({ describedBy: 'err', invalid: true })
  })

  it('hands nothing to a control the label wraps, or to read-only text', () => {
    expect(bindingOf('control', true, 'x')).toEqual({})
    expect(bindingOf('text', false, 'x')).toEqual({})
  })
})
