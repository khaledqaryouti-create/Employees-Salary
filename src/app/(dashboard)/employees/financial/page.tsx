import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { prisma } from '@/lib/prisma/client'
import { LinkButton } from '@/components/ui/link-button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DollarSign } from 'lucide-react'
import { FinancialTable } from './financial-table'
import { getTranslations } from 'next-intl/server'

export default async function EmployeesFinancialPage() {
  const { orgId } = await getProfileOrRedirect()
  const t = await getTranslations('employees')

  const employees = await prisma.employee.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      employeeNumber: true,
      fullName: true,
      country: true,
      jobTitle: true,
      orgUnit: { select: { name: true } },
      employmentType: true,
      isActive: true,
      salaryStructure: {
        include: {
          components: {
            include: {
              component: { select: { name: true, type: true } },
            },
          },
        },
      },
    },
    orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }],
  })

  const totalPayroll = employees.reduce((sum, e) => {
    if (!e.salaryStructure) return sum
    const components = e.salaryStructure.components.reduce((s, c) => {
      const amt = c.isPercentage
        ? (e.salaryStructure!.basicSalary * c.amount) / 100
        : c.amount
      return s + (c.component.type === 'DEDUCTION' ? 0 : amt)
    }, 0)
    return sum + e.salaryStructure.basicSalary + components
  }, 0)

  const withSalary = employees.filter((e) => e.salaryStructure).length

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('financialTitle')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('withSalaryCount', { count: withSalary, total: employees.length })}
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label={t('totalMonthlyPayroll')}
          value={new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 0 }).format(totalPayroll)}
          sub={t('totalMonthlyPayrollSub')}
          color="text-green-600"
        />
        <SummaryCard
          label={t('withSalary')}
          value={`${withSalary} / ${employees.length}`}
          sub={t('withSalarySub')}
          color="text-blue-600"
        />
        <SummaryCard
          label={t('missingSalary')}
          value={`${employees.length - withSalary}`}
          sub={t('missingSalarySub')}
          color="text-amber-600"
        />
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            {t('salaryDetails')}
          </CardTitle>
          <CardDescription>
            {t('salaryDetailsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {employees.length === 0 ? (
            <div className="text-center py-16">
              <DollarSign className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">{t('noEmployees')}</p>
              <div className="flex items-center justify-center gap-3 mt-6">
                <LinkButton variant="outline" href="/employees/import">{t('importFromExcel')}</LinkButton>
                <LinkButton href="/employees/new">{t('addEmployee')}</LinkButton>
              </div>
            </div>
          ) : (
            <FinancialTable employees={employees} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  label, value, sub, color,
}: Readonly<{ label: string; value: string; sub: string; color: string }>) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  )
}
