import { useEffect, type ReactNode } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { useGo } from '@/lib/nav'
import { useSession } from '@/state/session'
import { Skeleton } from './async'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { authState } = useSession()
  const navigate = useGo()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isPublic = pathname === '/signin'

  useEffect(() => {
    if (authState === 'anonymous' && !isPublic) {
      navigate({ to: '/signin', search: { next: pathname }, replace: true })
    }
  }, [authState, isPublic, pathname, navigate])

  if (authState === 'loading') {
    return (
      <div className="boot" role="status" aria-live="polite">
        <Skeleton width={180} height={12} radius={6} />
        Opening your workspace…
      </div>
    )
  }

  if (authState === 'anonymous' && !isPublic) return null

  return <>{children}</>
}
