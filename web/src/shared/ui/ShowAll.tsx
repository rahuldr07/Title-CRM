import type { CappedList } from '@/shared/hooks/useCappedList'
import { Btn } from './Button'

export function ShowAll<T>({ list, noun }: { list: CappedList<T>; noun: string }) {
  if (!list.hidden) return null
  return (
    <p className="gr" style={{ fontSize: 'var(--t-small)', marginTop: 10, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
      <span>
        Showing the first {list.shown.length} of {list.total} {noun}.
      </span>
      <Btn variant="ghost" small onClick={list.showAll}>
        Show all {list.total}
      </Btn>
    </p>
  )
}
