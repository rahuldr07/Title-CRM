import type { OrdersView } from '@/features/production/orders/ordersView'
import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
} from '@tanstack/react-router'
import { AppShell } from './AppShell'
import { RouteError } from './RouteError'
import { NotFound } from './NotFound'
import { useDateFormat } from '@/shared/hooks/useDateFormat'

const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: NotFound,
  errorComponent: RouteError,
})

type Load = Parameters<typeof lazyRouteComponent>[0]

function page(load: Load) {
  const Screen = lazyRouteComponent(load)
  function Page() {
    useDateFormat()
    return <Screen />
  }
  const { preload } = Screen
  return preload ? Object.assign(Page, { preload }) : Page
}

const screen = <P extends string>(path: P, load: Load) =>
  createRoute({ getParentRoute: () => rootRoute, path, component: page(load) })

const routeTree = rootRoute.addChildren([
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    beforeLoad: () => {
      throw redirect({ to: '/dash' })
    },
  }),

  screen('/dash', () => import('@/features/production/dashboard/DashboardPage')),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/orders',
    validateSearch: (s: Record<string, unknown>): OrdersView =>
      Object.fromEntries(
        (['pill', 'pr', 'cl', 'dept', 'staff', 'due'] as const)
          .filter((k) => typeof s[k] === 'string' && s[k] !== 'all')
          .map((k) => [k, s[k]]),
      ) as OrdersView,
    component: page(() => import('@/features/production/orders/OrdersPage')),
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/orders/new',
    validateSearch: (s: Record<string, unknown>): { mail?: string } =>
      typeof s.mail === 'string' ? { mail: s.mail } : {},
    component: page(() => import('@/features/production/orders/NewOrderPage')),
  }),
  screen('/orders/$orderId', () => import('@/features/production/orders/detail/OrderDetailPage')),
  screen('/mywork', () => import('@/features/production/my-work/MyWorkPage')),
  screen('/mypay', () => import('@/features/hrms/payslips/MyPayslipsPage')),
  screen('/myperf', () => import('@/features/production/my-performance/MyPerformancePage')),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/assign',
    validateSearch: (s: Record<string, unknown>): { tab?: string } =>
      typeof s.tab === 'string' ? { tab: s.tab } : {},
    component: page(() => import('@/features/production/assignment/AssignmentPage')),
  }),
  screen('/intake', () => import('@/features/production/intake/IntakePage')),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/commitment',
    validateSearch: (s: Record<string, unknown>): { order?: string } =>
      typeof s.order === 'string' ? { order: s.order } : {},
    component: page(() => import('@/features/production/commitment/CommitmentReportPage')),
  }),

  screen('/leads', () => import('@/features/business/leads/LeadsPage')),
  screen('/leads/new', () => import('@/features/business/leads/NewLeadPage')),
  screen('/leads/$leadId', () => import('@/features/business/leads/detail/LeadDetailPage')),
  screen('/billing', () => import('@/features/business/invoicing/InvoicingPage')),
  screen('/clients/$clientCode', () => import('@/features/business/clients/detail/ClientDetailPage')),

  screen('/attend', () => import('@/features/hrms/attendance/AttendancePage')),
  screen('/leave', () => import('@/features/hrms/leave/LeavePage')),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/leave/calendar',
    validateSearch: (s: Record<string, unknown>): { d?: string } =>
      typeof s.d === 'string' ? { d: s.d } : {},
    component: lazyRouteComponent(() => import('@/features/hrms/leave/LeaveCalendarPage')),
  }),
  screen('/payroll', () => import('@/features/hrms/payroll/PayrollPage')),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/payslips',
    validateSearch: (s: Record<string, unknown>): { tab?: string; m?: string; p?: string } => ({
      ...(typeof s.tab === 'string' ? { tab: s.tab } : {}),
      ...(typeof s.m === 'string' ? { m: s.m } : {}),
      ...(typeof s.p === 'string' ? { p: s.p } : {}),
    }),
    component: page(() => import('@/features/hrms/payslips/PayslipsPage')),
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/payslips/$personId',
    validateSearch: (s: Record<string, unknown>): { m?: string } =>
      typeof s.m === 'string' ? { m: s.m } : {},
    component: page(() => import('@/features/hrms/payslips/detail/PayslipDetailPage')),
  }),
  screen('/hiring', () => import('@/features/hrms/recruitment/RecruitmentPage')),
  screen('/petty', () => import('@/features/hrms/petty-cash/PettyCashPage')),
  screen('/loans', () => import('@/features/hrms/loans/LoansPage')),
  screen('/loans/new', () => import('@/features/hrms/loans/NewLoanPage')),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/loans/$loanId',
    validateSearch: (s: Record<string, unknown>): { tab?: string } =>
      typeof s.tab === 'string' ? { tab: s.tab } : {},
    component: page(() => import('@/features/hrms/loans/detail/LoanDetailPage')),
  }),

  createRoute({
    getParentRoute: () => rootRoute,
    path: '/counties',
    validateSearch: (s: Record<string, unknown>): { f?: string } =>
      typeof s.f === 'string' ? { f: s.f } : {},
    component: page(() => import('@/features/reference/counties/CountiesPage')),
  }),
  screen('/linkcheck', () => import('@/features/reference/link-monitor/LinkMonitorPage')),

  createRoute({
    getParentRoute: () => rootRoute,
    path: '/reports',
    validateSearch: (
      s: Record<string, unknown>,
    ): { tab?: string; sw?: string; dw?: string; focus?: string } => ({
      ...(typeof s.tab === 'string' ? { tab: s.tab } : {}),
      ...(typeof s.sw === 'string' ? { sw: s.sw } : {}),
      ...(typeof s.dw === 'string' ? { dw: s.dw } : {}),
      ...(typeof s.focus === 'string' ? { focus: s.focus } : {}),
    }),
    component: page(() => import('@/features/insight/reports/ReportsPage')),
  }),

  screen('/staff/$personId', () => import('@/features/configure/people/detail/PersonDetailPage')),

  screen('/integ', () => import('@/features/configure/integrations/IntegrationsPage')),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/company',
    validateSearch: (s: Record<string, unknown>): { tab?: string; sub?: string } => ({
      ...(typeof s.tab === 'string' ? { tab: s.tab } : {}),
      ...(typeof s.sub === 'string' ? { sub: s.sub } : {}),
    }),
    component: page(() => import('@/features/configure/company/CompanyPage')),
  }),
  screen('/onboard', () => import('@/features/configure/onboarding/OnboardingPage')),

  createRoute({
    getParentRoute: () => rootRoute,
    path: '/signin',
    validateSearch: (search: Record<string, unknown>): { next?: string } => {
      const next = search.next
      return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//')
        ? { next }
        : {}
    },
    component: page(() => import('@/features/auth/sign-in/SignInPage')),
  }),
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: false,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
