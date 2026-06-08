import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Download } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { DownloadPayslipButton } from './download-payslip-button'

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default async function PayslipsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile?.organizationId) redirect('/auth/login')

  const isEmployee = profile.role === 'EMPLOYEE'

  // Find this user's employee record if they are an employee
  const employeeRecord = isEmployee
    ? await prisma.employee.findFirst({
        where: { profile: { id: profile.id }, organizationId: profile.organizationId },
        select: { id: true },
      })
    : null

  const items = await prisma.payrollItem.findMany({
    where: {
      ...(isEmployee && employeeRecord
        ? { employeeId: employeeRecord.id }
        : { payrollRun: { organizationId: profile.organizationId } }),
      hasError: false,
    },
    include: {
      employee: { select: { fullName: true, employeeNumber: true, salaryStructure: true } },
      payrollRun: { select: { periodMonth: true, periodYear: true, status: true, name: true } },
    },
    orderBy: { payrollRun: { periodYear: 'desc' } },
    take: isEmployee ? 24 : 100,
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payslips</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isEmployee ? 'Your payslip history' : `${items.length} payslips`}
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Payslip History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No payslips yet</p>
              <p className="text-gray-400 text-sm mt-1">Payslips appear here after payroll runs are processed</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map((item) => {
                const periodLabel = `${MONTHS[item.payrollRun.periodMonth] ?? ''} ${item.payrollRun.periodYear}`
                const currency = item.employee.salaryStructure?.currency ?? 'USD'
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      {!isEmployee && (
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {item.employee.fullName}
                          <span className="text-gray-400 font-normal ml-2 text-xs">
                            #{item.employee.employeeNumber}
                          </span>
                        </p>
                      )}
                      <p className={`text-sm ${isEmployee ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                        {periodLabel}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 font-medium">
                          Net: {formatCurrency(item.netPay, currency)}
                        </span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-400">
                          Gross: {formatCurrency(item.grossPay, currency)}
                        </span>
                        <Badge
                          className={
                            item.payrollRun.status === 'PAID'
                              ? 'text-xs bg-green-100 text-green-700 hover:bg-green-100'
                              : 'text-xs bg-blue-100 text-blue-700 hover:bg-blue-100'
                          }
                        >
                          {item.payrollRun.status}
                        </Badge>
                      </div>
                    </div>
                    <DownloadPayslipButton itemId={item.id} periodLabel={periodLabel} />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
