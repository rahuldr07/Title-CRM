import { webHref } from '@/shared/lib/format'

export function WebLink({ address, children, about }: { address: string; children?: string; about?: string }) {
  const href = webHref(address)
  const text = children ?? address
  if (!href) return <>{text}</>
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {text}
      <span aria-hidden="true"> ↗</span>
      <span className="sr-only">{about ? ` ${about}` : ''} (opens in a new tab)</span>
    </a>
  )
}
