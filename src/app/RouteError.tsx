import { useEffect } from 'react'
import { LoadFailed } from '@/shared/ui/ErrorBoundary'
import { useTitlePart } from '@/shared/hooks/useTitlePart'

export function RouteError({ error, reset }: { error: unknown; reset?: () => void }) {
  useTitlePart('page', 'This screen did not load')
  useEffect(() => {
    console.error('Route error:', error)
  }, [error])
  return <LoadFailed what="This screen" error={error} onRetry={reset} />
}
