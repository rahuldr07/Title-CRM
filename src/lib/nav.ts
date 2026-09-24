import { useCallback } from 'react'
import { useNavigate, type NavigateOptions, type RegisteredRouter } from '@tanstack/react-router'
import { useSession } from '@/state/session'
import { routeNeeds } from '@/lib/permissions'

export type Go = <
  TRouter extends RegisteredRouter = RegisteredRouter,
  TTo extends string | undefined = undefined,
  TFrom extends string = string,
  TMaskFrom extends string = TFrom,
  TMaskTo extends string = '',
>(
  opts: NavigateOptions<TRouter, TFrom, TTo, TMaskFrom, TMaskTo>,
) => void

export function useGo(): Go {
  const navigate = useNavigate()
  return useCallback<Go>(
    (opts) => {
      navigate(opts).catch((error: unknown) => {
        console.error('Navigation failed:', error)
      })
    },
    [navigate],
  )
}

/* Whether the signed-in person can open a route. A link to a screen they cannot
   open lands on "You do not have access", so such links render as plain text. */
export function useMayOpen(route: string): boolean {
  const { can } = useSession()
  const need = routeNeeds(route)
  return !need || can(need)
}
