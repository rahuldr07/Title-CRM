import { webHref } from '@/lib/format'

/** A county research address a searcher can open in one click — or plain text when it is not a web address. */
export function WebLink({ address }: { address: string }) {
  const href = webHref(address)
  if (!href) return <>{address}</>
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {address}
      <span aria-hidden="true"> ↗</span>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}
