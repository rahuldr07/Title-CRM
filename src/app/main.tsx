import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from './router'
import { SessionProvider } from '@/domain/auth/SessionProvider'
import { UiProvider } from '@/shared/ui/UiProvider'
import { RulesProvider } from '@/domain/assignment/RulesProvider'
import { TimeclockProvider } from '@/domain/attendance/TimeclockProvider'
import '@/styles/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

const root = document.getElementById('root')
if (!root) throw new Error('#root is missing from index.html')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <UiProvider>
          <RulesProvider>
            <TimeclockProvider>
              <RouterProvider router={router} />
            </TimeclockProvider>
          </RulesProvider>
        </UiProvider>
      </SessionProvider>
    </QueryClientProvider>
  </StrictMode>,
)
