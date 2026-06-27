import { notFound } from 'next/navigation'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { prisma } from '@/lib/prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/link-button'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import {
  ArrowLeft,
  Calendar,
  Users,
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'

const statusColorMap: Record<string, string> = {
  DRAFT:            'bg-gray-100 text-gray-600',
  PROCESSING:       'bg-yellow-100 text-yellow-700',
  COMPLETED:        'bg-green-100 text-green-700',
  FAILED:           'bg-red-100 text-red-700',
  PENDING_APPROVAL: 'bg-orange-100 text-orange-700',
  APPROVED:         'bg-blue-100 text-blue-700',
  PAID:             'bg-purple-100 text-purple-700',
}

const statusLabel: Record<string, string> = {
  DRAFT:            'Draft',
  PROCESSING:       'Processing',
  COMPLETED:        'Completed',
  FAILED:           'Failed',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED:         'Approved',
  PAID:             'Paid',
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default async function PayrollRunDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>
}>) {
  const { orgId } = await getProfileOrRedirect()
  const { id } = await params

  const run = await prisma.payrollRun.findFirst({
    where: { id, organizationId: orgId },
    include: {
      items: {
        include: {
          employee: { select: { fullName: true, employeeNumber: true } },
        },
        orderBy: { employee: { fullName: 'asc' } },
      },
    },
  })

  if (!run) notFound()

  const periodLabel = `${MONTHS[(run.periodMonth ?? 1) - 1]} ${run.periodYear}`
  const currency = run.currency ?? 'USD'
  const errorCount = run.items.filter((i) => i.hasError).length

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <LinkButton variant="ghost" href="/payroll" size="sm" className="mt-1 shrink-0">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </LinkButton>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 truncate">
              {run.name ?? `Payroll – ${periodLabel}`}
            </h1>
            <Badge className={`text-xs shrink-0 ${statusColorMap[run.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {statusLabel[run.status] ?? run.status}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {periodLabel}
            </span>
            {run.processedAt && (
              <span>Processed {formatDate(run.processedAt)}</span>
            )}
            {run.approvedAt && (
              <span>Approved {formatDate(run.approvedAt)}</span>
            )}
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <AlertTriangle className="w-3.5 h-3.5" />
                {errorCount} error{errorCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard
          icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
          bg="bg-blue-50"
          label="Total Gross"
          value={formatCurrency(run.totalGross, currency)}
        />
        <SummaryCard
          icon={<TrendingDown className="w-5 h-5 text-red-400" />}
          bg="bg-red-50"
          label="Total Deductions"
          value={formatCurrency(run.totalDeductions, currency)}
        />
        <SummaryCard
          icon={<DollarSign className="w-5 h-5 text-green-500" />}
          bg="bg-green-50"
          label="Total Net"
          value={formatCurrency(run.totalNet, currency)}
        />
        <SummaryCard
          icon={<Users className="w-5 h-5 text-purple-500" />}
          bg="bg-purple-50"
          label="Employees"
          value={String(run.employeeCount)}
        />
      </div>

      {/* Items table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Employee Payroll Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {run.items.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-200" />
              <p className="font-medium text-gray-500">No payroll items found</p>
              <p className="text-sm mt-1">This run has no processed employees.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Employee</th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide text-right">Gross Pay</th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide text-right">Deductions</th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide text-right">Earnings</th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide text-right">Net Pay</th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {run.items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{item.employee.fullName}</p>
                        <p className="text-xs text-gray-400">{item.employee.employeeNumber}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {formatCurrency(item.grossPay, currency)}
                      </td>
                      <td className="px-4 py-3 text-right text-red-500">
                        {formatCurrency(item.totalDeductions, currency)}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-600">
                        {formatCurrency(item.totalEarnings, currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatCurrency(item.netPay, currency)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.hasError ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs text-red-600"
                            title={item.errorMessage ?? 'Error'}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Error
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  icon,
  bg,
  label,
  value,
}: Readonly<{
  icon: React.ReactNode
  bg: string
  label: string
  value: string
}>) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-base font-bold text-gray-900 truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
