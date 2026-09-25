import type { Gap } from '@/domain/assignment/qualification'

export const gapWhere = (g: Gap): string => (g.kind === 'place' ? `${g.co}, ${g.st}` : g.pr)

export const levelsNoticeTitle = (held: number, gaps: number, moved: number): string =>
  [
    held ? `${held} order${held === 1 ? '' : 's'} held today` : '',
    gaps ? `${gaps} gap${gaps === 1 ? '' : 's'} nobody covers` : '',
    moved ? `${moved} moved when levels were introduced` : '',
  ]
    .filter(Boolean)
    .join(' · ')

export const gapsSentence = (gaps: Gap[]): string =>
  gaps.length
    ? `Nothing can be given for ${gaps.slice(0, 3).map(gapWhere).join(', ')}${
        gaps.length > 3 ? ` and ${gaps.length - 3} more` : ''
      }.`
    : 'Every county and product has somebody. '

export const countiesShown = (have: number, named: number): string =>
  !have ? 'whole state' : named ? `${named} of ${have}` : 'all'

export const onLevelSentence = (n: number): string =>
  n
    ? `${n} ${n === 1 ? 'person is' : 'people are'} on this level, so a change here moves ${n === 1 ? 'them' : 'them all'} tonight.`
    : 'Nobody is on this level yet, so changing it moves nobody.'

export const levelBadge = (n: string): string | undefined => (n.match(/\d+/) ?? [n.slice(0, 2)])[0]
