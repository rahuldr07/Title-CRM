import type { ComponentProps, ReactNode } from 'react'

type AnchorProps = Omit<ComponentProps<'a'>, 'href' | 'target' | 'rel'> & { href: string; children: ReactNode }

export function Anchor({ href, children, ...rest }: AnchorProps) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}

export function MailLink({ address }: { address: string }) {
  return (
    <a className="br" href={`mailto:${address}`}>
      {address}
    </a>
  )
}
