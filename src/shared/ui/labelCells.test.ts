import { Fragment, createElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { labelCells } from './labelCells'

const Cell = (_: { v?: string; label?: string }) => null
const Marks = (_: { label?: string }) => null

const propsOf = (nodes: ReactNode[]) =>
  nodes.map((n) => (isValidElement(n) ? (n as ReactElement<Record<string, unknown>>).props : n))

describe('column labels on a flex row', () => {
  it('reach every component in the row, not only a literal Cell', () => {
    const out = labelCells([createElement(Cell, { v: 'a' }), createElement(Marks)], ['Order', 'Marks'])
    expect(propsOf(out)).toEqual([
      { v: 'a', label: 'Order' },
      { label: 'Marks' },
    ])
  })

  it('reach a plain element as the data attribute the phone layout reads', () => {
    const out = labelCells([createElement('div', { className: 'cell' })], ['Who'])
    expect(propsOf(out)).toEqual([{ className: 'cell', 'data-label': 'Who' }])
  })

  it('skip a column left out, so the next one keeps its own label', () => {
    const out = labelCells([createElement(Cell), null, createElement(Cell)], ['Client', 'Terms'])
    expect(propsOf(out).map((p) => (p as { label?: string }).label)).toEqual(['Client', 'Terms'])
  })

  it('leave text alone', () => {
    expect(labelCells(['plain'], ['Note'])).toEqual(['plain'])
  })
})

describe('an empty column heading', () => {
  it('gives its cell no label, so an action column shows no empty caption on a phone', () => {
    const out = labelCells([createElement(Cell), createElement('div')], ['Client', ''])
    expect(propsOf(out)).toEqual([{ label: 'Client' }, {}])
  })
})

describe('cells grouped in a fragment', () => {
  it('are labelled as the columns they fill, one heading each', () => {
    const out = labelCells(
      [createElement(Cell), createElement(Fragment, null, createElement(Cell), createElement(Cell))],
      ['Order', 'Gross', 'Net'],
    )
    expect(propsOf(out).map((p) => (p as { label?: string }).label)).toEqual(['Order', 'Gross', 'Net'])
  })

  it('keep keys that do not collide with the cells around them', () => {
    const out = labelCells(
      [createElement(Cell), createElement(Fragment, null, createElement(Cell), createElement(Cell))],
      ['a', 'b', 'c'],
    )
    const keys = out.map((n) => (isValidElement(n) ? n.key : null))
    expect(new Set(keys).size).toBe(3)
  })
})
