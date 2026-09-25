import { useMemo } from 'react'
import { useSession } from '@/domain/auth/SessionProvider'
import { useUi } from '@/shared/ui/UiProvider'
import type { Person } from '@/data/types'
import { csvName, downloadCSV } from '@/shared/lib/csv'
import type { Payslip } from '@/domain/payroll/payroll'
import {
  payslipFileStem,
  payslipRows,
  registerFileStem,
  registerRows,
} from '@/domain/payroll/payrollCsv'

export interface PayslipDownloads {
  payslip: (person: Person, month: string) => void
  register: (month: string, list: Payslip[]) => void
}

export function usePayslipDownloads(): PayslipDownloads {
  const { toast } = useUi()
  const { tenant } = useSession()

  return useMemo(
    () => ({
      payslip: (person: Person, month: string) => {
        const out = downloadCSV(
          csvName(payslipFileStem(person, month)),
          payslipRows(person, month, tenant.name),
        )
        toast(out.name)
      },
      register: (month: string, list: Payslip[]) => {
        const out = downloadCSV(csvName(registerFileStem(month)), registerRows(list))
        toast(`${out.name} — ${out.rows.length - 1} people`)
      },
    }),
    [toast, tenant.name],
  )
}
