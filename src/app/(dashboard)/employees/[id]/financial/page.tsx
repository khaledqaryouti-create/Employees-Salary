import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { prisma } from '@/lib/prisma/client'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/link-button'
import {
  ArrowLeft, DollarSign, FileText, TrendingUp, Minus, Link2,
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import { EditSalaryButton } from './edit-salary-button'
import { AllowancesPanel } from './allowances-panel'

export default async function EmployeeFinancialPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { orgId } = await getProfileOrRedirect()
  const t = await getTranslations('employees')
  const tc = await getTranslations('common')

  const employee = await prisma.employee.findFirst({
    where: { id, organizationId: orgId },
    include: {
      salaryStructure: {
        include: {
          components: {
            include: { component: { select: { name: true, type: true } } },
          },
        },
      },
      payrollItems: {
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { payrollRun: { select: { periodMonth: true, periodYear: true, status: true } } },
      },
      externalIds: {
        orderBy: { system: 'asc' },
      },
      orgUnit: { select: { name: true } },
    },
  })
  if (!employee) notFound()

  const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const STATUS_COLORS: Record<string, string> = {
    COMPLETED: 'bg-green-100 text-green-700',
    PAID:      'bg-purple-100 text-purple-700',
    DRAFT:     'bg-gray-100 text-gray-600',
    PROCESSING:'bg-yellow-100 text-yellow-700',
    FAILED:    'bg-red-100 text-red-700',
    APPROVED:  'bg-blue-100 text-blue-700',
  }

  const s = employee.salaryStructure
  const earnings   = s?.components.filter((c) => c.component.type !== 'DEDUCTION') ?? []
  const deductions = s?.components.filter((c) => c.component.type === 'DEDUCTION') ?? []
  const totalEarnings   = earnings.reduce((sum, c)   => sum + (c.isPercentage ? (s!.basicSalary * c.amount) / 100 : c.amount), 0)
  const totalDeductions = deductions.reduce((sum, c) => sum + (c.isPercentage ? (s!.basicSalary * c.amount) / 100 : c.amount), 0)
  const netTotal = s ? s.basicSalary + totalEarnings - totalDeductions : 0

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <LinkButton href="/employees/financial" variant="ghost" size="sm">
        <ArrowLeft className="w-4 h-4 mr-1" /> {t('financialTitle')}
      </LinkButton>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center shrink-0">
            <DollarSign className="w-7 h-7 text-green-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{employee.fullName}</h1>
              <Badge variant="secondary" className="font-mono text-xs">{employee.employeeNumber}</Badge>
              <Badge className={employee.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                {employee.isActive ? tc('active') : tc('inactive')}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {employee.jobTitle ?? t('noTitle')} · {employee.orgUnit?.name ?? t('noDepartment')}
            </p>
          </div>
        </div>
        {s && (
          <EditSalaryButton
            employeeId={id}
            currentSalary={s.basicSalary}
            currentCurrency={s.currency}
          />
        )}
      </div>

      {/* Summary stat cards */}
      {s && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: t('basicSalary'),      value: formatCurrency(s.basicSalary, s.currency),     color: 'text-gray-900' },
            { label: t('totalAllowances'),  value: `+ ${formatCurrency(totalEarnings, s.currency)}`,   color: 'text-green-600' },
            { label: t('totalDeductions'),  value: `− ${formatCurrency(totalDeductions, s.currency)}`, color: 'text-red-600' },
            { label: t('netPackage'),       value: formatCurrency(netTotal, s.currency),           color: 'text-blue-700 font-bold text-lg' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
              <p className={`mt-1 font-mono ${color} text-base`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Salary structure breakdown */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" /> {t('salaryStructure')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!s ? (
            <div className="py-8 text-center">
              <DollarSign className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">{t('noSalaryStructure')}</p>
              <div className="mt-4">
                <EditSalaryButton employeeId={id} currentSalary={0} currentCurrency="USD" />
              </div>
            </div>
          ) : (
            <div className="space-y-1 text-sm">
              {/* Basic */}
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-600 font-medium">{t('basicSalary')}</span>
                <span className="font-mono font-semibold">{formatCurrency(s.basicSalary, s.currency)}</span>
              </div>

              {/* Earnings */}
              {earnings.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2 pb-1">
                    {t('earningsAllowances')}
                  </p>
                  {earnings.map((c) => {
                    const amt = c.isPercentage ? (s.basicSalary * c.amount) / 100 : c.amount
                    return (
                      <div key={c.id} className="flex justify-between py-1.5">
                        <span className="text-gray-600 flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                          {c.component.name}
                          {c.isPercentage && (
                            <span className="text-gray-400 text-xs">({c.amount}%)</span>
                          )}
                        </span>
                        <span className="font-mono text-green-700">+ {formatCurrency(amt, s.currency)}</span>
                      </div>
                    )
                  })}
                </>
              )}

              {/* Deductions */}
              {deductions.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2 pb-1">
                    {tc('deductions')}
                  </p>
                  {deductions.map((c) => {
                    const amt = c.isPercentage ? (s.basicSalary * c.amount) / 100 : c.amount
                    return (
                      <div key={c.id} className="flex justify-between py-1.5">
                        <span className="text-gray-600 flex items-center gap-1.5">
                          <Minus className="w-3.5 h-3.5 text-red-400" />
                          {c.component.name}
                          {c.isPercentage && (
                            <span className="text-gray-400 text-xs">({c.amount}%)</span>
                          )}
                        </span>
                        <span className="font-mono text-red-600">− {formatCurrency(amt, s.currency)}</span>
                      </div>
                    )
                  })}
                </>
              )}

              {/* Net total */}
              <div className="flex justify-between py-3 border-t-2 border-gray-200 mt-2 font-semibold">
                <span>{t('netTotalPackage')}</span>
                <span className="font-mono text-blue-700 text-base">{formatCurrency(netTotal, s.currency)}</span>
              </div>
              <p className="text-xs text-gray-400">{t('effectiveFrom', { date: formatDate(s.effectiveFrom) })}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allowances */}
      <AllowancesPanel
        employeeId={id}
        currency={s?.currency ?? 'USD'}
        basicSalary={s?.basicSalary ?? 0}
        existingAllowances={earnings.map((c) => ({
          id:           c.id,
          name:         c.component.name,
          amount:       c.amount,
          isPercentage: c.isPercentage,
        }))}
      />

      {/* Payroll history */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-600" /> {t('payrollHistory')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {employee.payrollItems.length === 0 ? (
            <p className="text-sm text-gray-400">{t('noPayslips')}</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {employee.payrollItems.map((item) => (
                <div key={item.id} className="py-2.5 flex justify-between text-sm">
                  <div>
                    <p className="font-medium">
                      {MONTHS[item.payrollRun.periodMonth]} {item.payrollRun.periodYear}
                    </p>
                    <Badge className={`text-xs mt-0.5 ${STATUS_COLORS[item.payrollRun.status] ?? ''}`}>
                      {item.payrollRun.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold">
                      {formatCurrency(item.netPay, s?.currency ?? 'USD')}
                    </p>
                    <p className="text-xs text-gray-400">
                      Gross: {formatCurrency(item.grossPay, s?.currency ?? 'USD')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 pt-3 border-t">
            <LinkButton href="/payslips" variant="ghost" size="sm" className="w-full justify-center text-xs">
              {t('viewAllPayslips')}
            </LinkButton>
          </div>
        </CardContent>
      </Card>

      {/* External System IDs */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="w-4 h-4 text-indigo-600" /> {t('externalIds')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {employee.externalIds.length === 0 ? (
            <div className="py-6 text-center">
              <Link2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">{t('noExternalIds')}</p>
              <p className="text-xs text-gray-300 mt-1">
                {t('externalIdsDesc')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {employee.externalIds.map((ext) => (
                <div key={ext.id} className="py-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-700 uppercase tracking-wide">
                      {ext.system}
                    </span>
                    {ext.label && (
                      <span className="text-gray-500 text-xs">{ext.label}</span>
                    )}
                  </div>
                  <span className="font-mono text-gray-700 text-xs">{ext.externalId}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
