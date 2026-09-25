import { afterEach } from 'vitest'

import { resetClock } from '@/shared/lib/clock'
import { resetBoard as resetAssignmentBoard } from '@/domain/assignment/engine'
import { resetLevels } from '@/domain/assignment/levels'
import { resetCompany } from '@/domain/company/companyStore'
import { resetCoverage } from '@/domain/counties/counties'
import { resetQcRules } from '@/domain/quality/qcRules'
import { resetPrefixes } from '@/features/business/clients/detail/prefixes'
import { resetUpdates } from '@/features/production/my-work/updates'
import { resetBox } from '@/features/hrms/petty-cash/pettyStore'
import { resetOrders } from '@/domain/orders/orders'
import { resetHiringBoard } from '@/features/hrms/recruitment/hiring'
import { resetLoans } from '@/domain/loans/loanStore'
import { resetRuns } from '@/domain/payroll/payruns'
import { resetOvertime } from '@/domain/payroll/overtime'
import { resetPayments } from '@/domain/invoices/payments'
import { resetLeave } from '@/domain/leave/leaveStore'
import { resetTimeRules } from '@/domain/attendance/timeRules'
import { resetRules } from '@/domain/assignment/rules'
import { resetTimeclock } from '@/domain/attendance/timeclock'
import { resetLeads } from '@/domain/leads/leads'
import { resetChats } from '@/features/production/my-work/chats'
import { resetReportExport } from '@/features/insight/reports/reportExport'
import { resetAuthority } from '@/domain/auth/permissions'

afterEach(() => {
  resetClock()

  resetCompany()
  resetCoverage()
  resetLevels()
  resetQcRules()
  resetPrefixes()
  resetUpdates()
  resetBox()
  resetOrders()
  resetHiringBoard()
  resetLoans()
  resetRuns()
  resetOvertime()
  resetPayments()
  resetLeave()
  resetTimeRules()
  resetChats()
  resetRules()
  resetTimeclock()
  resetLeads()
  resetReportExport()
  resetAuthority()

  resetAssignmentBoard()
})
