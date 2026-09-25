import { describe, expect, it } from 'vitest'
import { countiesShown, gapWhere, gapsSentence, levelBadge, levelsNoticeTitle, onLevelSentence } from './levelsText'
import type { Gap } from '@/domain/assignment/qualification'

const place = (co: string, st: string): Gap => ({ kind: 'place', stage: 'Search', st, co, near: [] })
const product = (pr: string): Gap => ({ kind: 'product', stage: 'Search', pr, near: [] })

describe('where a coverage gap is', () => {
  it('names a county with its state, and a product by its code', () => {
    expect(gapWhere(place('Cambria', 'PA'))).toBe('Cambria, PA')
    expect(gapWhere(product('COS'))).toBe('COS')
  })
})

describe('the levels notice', () => {
  it('joins only the counts that are not zero, singular and plural', () => {
    expect(levelsNoticeTitle(1, 0, 0)).toBe('1 order held today')
    expect(levelsNoticeTitle(3, 1, 8)).toBe('3 orders held today · 1 gap nobody covers · 8 moved when levels were introduced')
    expect(levelsNoticeTitle(0, 2, 0)).toBe('2 gaps nobody covers')
    expect(levelsNoticeTitle(0, 0, 0)).toBe('')
  })

  it('names the first three gaps and counts the rest', () => {
    expect(gapsSentence([place('Cambria', 'PA'), product('COS')])).toBe('Nothing can be given for Cambria, PA, COS.')
    expect(gapsSentence([product('A'), product('B'), product('C'), product('D'), product('E')])).toBe(
      'Nothing can be given for A, B, C and 2 more.',
    )
  })

  it('says every county and product has somebody when there is no gap', () => {
    expect(gapsSentence([])).toBe('Every county and product has somebody. ')
  })
})

describe('the counties a level covers in a state', () => {
  it('is the whole state with none on file, all with none named, and a count otherwise', () => {
    expect(countiesShown(0, 0)).toBe('whole state')
    expect(countiesShown(5, 0)).toBe('all')
    expect(countiesShown(5, 2)).toBe('2 of 5')
  })
})

describe('who a level change moves', () => {
  it('counts the people on the level', () => {
    expect(onLevelSentence(0)).toBe('Nobody is on this level yet, so changing it moves nobody.')
    expect(onLevelSentence(1)).toBe('1 person is on this level, so a change here moves them tonight.')
    expect(onLevelSentence(4)).toBe('4 people are on this level, so a change here moves them all tonight.')
  })
})

describe('a level badge', () => {
  it('is the number in the name, or its first two letters', () => {
    expect(levelBadge('Level 12')).toBe('12')
    expect(levelBadge('Trainee')).toBe('Tr')
  })
})
