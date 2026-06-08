import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/link-button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  Calculator,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowRight,
  Plus,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    include: { organization: true },
  })
  if (!profile?.organizationId) redirect('/auth/login')

  const orgId = profile.organizationId

  // Fetch all KPIs in parallel
  const [
    totalEmployees,
    recentRuns,
    pendingLeaves,
    thisMonthRun,
  ] = await Promise.all([
    prisma.employee.count({ where: { organizationId: orgId, isActive: true } }),
    prisma.payrollRun.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.leaveRequest.count({
      where: {
        employee: { organizationId: orgId },
        status: 'PENDING',
      },
    }),
    prisma.payrollRun.findFirst({
      where: {
        organizationId: orgId,
        periodYear: new Date().getFullYear(),
        periodMonth: new Date().getMonth() + 1,
      },
    }),
  ])

  const currency = profile.organization?.currency ?? 'USD'

  const kpis = [
    {
      label: 'Active Employees',
      value: totalEmployees.toString(),
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      description: 'Across all departments',
    },
    {
      label: 'This Month Payroll',
      value: thisMonthRun
        ? formatCurrency(thisMonthRun.totalGross, currency)
        : 'Not run yet',
      icon: Calculator,
      color: 'text-green-600',
      bg: 'bg-green-50',
      description: thisMonthRun
        ? `${thisMonthRun.employeeCount} employees`
        : 'Run payroll to see totals',
    },
    {
      label: 'Pending Approvals',
      value: pendingLeaves.toString(),
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      description: 'Leave requests awaiting action',
    },
    {
      label: 'Payroll Status',
      value: thisMonthRun?.status ?? 'Not Started',
      icon: thisMonthRun?.status === 'APPROVED' ? CheckCircle2 : AlertCircle,
      color: thisMonthRun?.status === 'APPROVED' ? 'text-green-600' : 'text-gray-500',
      bg: thisMonthRun?.status === 'APPROVED' ? 'bg-green-50' : 'bg-gray-50',
      description: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LinkButton href="/payroll/new">
            <Plus className="w-4 h-4 mr-2" />
            Run Payroll
          </LinkButton>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1 truncate">{kpi.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{kpi.description}</p>
                </div>
                <div className={`w-10 h-10 ${kpi.bg} rounded-xl flex items-center justify-center shrink-0 ml-3`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent payroll runs */}
        <Card className="xl:col-span-2 border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base">Recent Payroll Runs</CardTitle>
              <CardDescription>Latest payroll processing activity</CardDescription>
            </div>
            <LinkButton variant="ghost" size="sm" href="/payroll" className="flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </LinkButton>
          </CardHeader>
          <CardContent>
            {recentRuns.length === 0 ? (
              <div className="text-center py-10">
                <Calculator className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No payroll runs yet</p>
                <LinkButton size="sm" className="mt-4" href="/payroll/new">
                  Run your first payroll
                </LinkButton>
              </div>
            ) : (
              <div className="space-y-3">
                {recentRuns.map((run: typeof recentRuns[number]) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{run.name}</p>
                        <p className="text-xs text-gray-400">
                          {run.employeeCount} employees · {run.periodYear}/{String(run.periodMonth).padStart(2, '0')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-sm font-semibold text-gray-900 hidden sm:block">
                        {formatCurrency(run.totalNet, currency)}
                      </span>
                      <StatusBadge status={run.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { label: 'Add Employee', href: '/employees/new', icon: Users },
                { label: 'Run Payroll', href: '/payroll/new', icon: Calculator },
                { label: 'Review Leave Requests', href: '/leave', icon: Clock },
                { label: 'Formula Builder', href: '/settings/formula-builder', icon: AlertCircle },
                { label: 'View Reports', href: '/reports', icon: TrendingUp },
              ].map((action) => (
                <LinkButton
                  key={action.href}
                  variant="ghost"
                  href={action.href}
                  className="w-full justify-start h-10 text-sm"
                >
                  <action.icon className="w-4 h-4 mr-3 text-gray-400" />
                  {action.label}
                </LinkButton>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
    PROCESSING: { label: 'Processing', className: 'bg-blue-100 text-blue-700' },
    PENDING_APPROVAL: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
    APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-700' },
    PAID: { label: 'Paid', className: 'bg-emerald-100 text-emerald-700' },
    FAILED: { label: 'Failed', className: 'bg-red-100 text-red-700' },
  }
  const v = variants[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${v.className}`}>
      {v.label}
    </span>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Skeleton className="xl:col-span-2 h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  )
}
