import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { prisma } from '@/lib/prisma/client'
import { notFound, redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/link-button'
import {
  Building2, Users, Globe, ArrowLeft,
  DollarSign, Calculator,
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils/format'

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { profile } = await getProfileOrRedirect()
  if (profile.role !== 'SUPER_ADMIN') redirect('/dashboard')

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      _count: { select: { employees: true, payrollRuns: true } },
      branding: true,
    },
  })
  if (!org) notFound()

  const [employees, recentRuns, totalPaid] = await Promise.all([
    prisma.employee.findMany({
      where: { organizationId: id, isActive: true },
      include: { salaryStructure: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.payrollRun.findMany({
      where: { organizationId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.payrollRun.aggregate({
      where: { organizationId: id, status: 'PAID' },
      _sum: { totalNet: true },
    }),
  ])

  const countryBreakdown = employees.reduce<Record<string, number>>((acc, e) => {
    acc[e.country] = (acc[e.country] ?? 0) + 1
    return acc
  }, {})

  const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600',
    PROCESSING: 'bg-yellow-100 text-yellow-700',
    COMPLETED: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700',
    APPROVED: 'bg-blue-100 text-blue-700',
    PAID: 'bg-purple-100 text-purple-700',
    PENDING_APPROVAL: 'bg-orange-100 text-orange-700',
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <LinkButton href="/admin/tenants" variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> All Tenants
        </LinkButton>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
            <Building2 className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
              <Badge variant="secondary" className="font-mono text-xs">{org.slug}</Badge>
              <Badge className={org.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                {org.isActive ? 'Active' : 'Suspended'}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {org.country ?? 'Multi-country'} · {org.currency ?? 'USD'} · Created {formatDate(org.createdAt)}
            </p>
          </div>
        </div>
        <LinkButton href={`/admin/tenants/${id}/edit`} variant="outline" size="sm">
          Edit Settings
        </LinkButton>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Employees', value: org._count.employees, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Payroll Runs', value: org._count.payrollRuns, icon: Calculator, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Total Paid', value: formatCurrency(totalPaid._sum.totalNet ?? 0, org.currency ?? 'USD'), icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Countries', value: Object.keys(countryBreakdown).length, icon: Globe, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center mb-3`}>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Employees */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" /> Recent Employees
            </CardTitle>
            <CardDescription>{org._count.employees} total active</CardDescription>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <p className="text-sm text-gray-400">No employees yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {employees.map((emp) => (
                  <div key={emp.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{emp.fullName}</p>
                      <p className="text-xs text-gray-500">{emp.jobTitle} · {emp.country}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono">
                        {formatCurrency(emp.salaryStructure?.basicSalary ?? 0, emp.salaryStructure?.currency ?? 'USD')}
                      </p>
                      <p className="text-xs text-gray-400">{emp.employmentType}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 pt-3 border-t">
              <LinkButton href={`/employees`} variant="ghost" size="sm" className="w-full justify-center text-xs">
                View All Employees
              </LinkButton>
            </div>
          </CardContent>
        </Card>

        {/* Recent Payroll Runs */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="w-4 h-4 text-green-600" /> Recent Payroll Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentRuns.length === 0 ? (
              <p className="text-sm text-gray-400">No payroll runs yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentRuns.map((run) => (
                  <div key={run.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{run.name ?? `Run #${run.id.slice(-6)}`}</p>
                      <p className="text-xs text-gray-500">
                        {run.periodMonth}/{run.periodYear} · {run.employeeCount} employees
                      </p>
                    </div>
                    <Badge className={`text-xs ${STATUS_COLORS[run.status] ?? ''}`}>{run.status}</Badge>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 pt-3 border-t">
              <LinkButton href="/payroll" variant="ghost" size="sm" className="w-full justify-center text-xs">
                View All Runs
              </LinkButton>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Org Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Organization Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {[
              { label: 'Pay Frequency', value: org.payFrequency ?? 'MONTHLY' },
              { label: 'Currency', value: org.currency ?? 'USD' },
              { label: 'Country', value: org.country ?? 'Multi-country' },
              { label: 'Status', value: org.isActive ? 'Active' : 'Suspended' },
              { label: 'Brand Color', value: org.branding?.primaryColor ?? 'Default' },
              { label: 'Created', value: formatDate(org.createdAt) },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className="font-medium mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
