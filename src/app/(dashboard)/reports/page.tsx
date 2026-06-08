import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, TrendingUp, Users, DollarSign, Globe } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import { PayrollTrendChart } from './payroll-trend-chart'
import { CountryBreakdownChart } from './country-breakdown-chart'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile?.organizationId) redirect('/auth/login')

  const orgId = profile.organizationId

  // ── Summary stats ──────────────────────────────────────────────────────────
  const [
    totalEmployees,
    activeEmployees,
    payrollRuns,
    recentItems,
    countryBreakdown,
  ] = await Promise.all([
    prisma.employee.count({ where: { organizationId: orgId } }),
    prisma.employee.count({ where: { organizationId: orgId, isActive: true } }),
    prisma.payrollRun.findMany({
      where: { organizationId: orgId },
      orderBy: { periodYear: 'asc' },
      select: {
        periodYear: true,
        periodMonth: true,
        totalNet: true,
        totalGross: true,
        totalDeductions: true,
        employeeCount: true,
        status: true,
      },
      take: 12,
    }),
    prisma.payrollItem.findMany({
      where: { payrollRun: { organizationId: orgId }, hasError: false },
      include: { employee: { select: { country: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.employee.groupBy({
      by: ['country'],
      where: { organizationId: orgId, isActive: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
  ])

  // Aggregate net pay by country from recent items
  const countryPayMap: Record<string, number> = {}
  for (const item of recentItems) {
    const c = item.employee.country
    countryPayMap[c] = (countryPayMap[c] ?? 0) + item.netPay
  }

  // Trend data for chart
  const trendData = payrollRuns.map((r) => ({
    label: `${r.periodYear}-${String(r.periodMonth).padStart(2, '0')}`,
    gross: r.totalGross ?? 0,
    net: r.totalNet ?? 0,
    deductions: r.totalDeductions ?? 0,
    employees: r.employeeCount ?? 0,
  }))

  const latestRun = payrollRuns.at(-1)
  const totalPayroll = payrollRuns.reduce((s, r) => s + (r.totalNet ?? 0), 0)

  const countryData = countryBreakdown.map((c) => ({
    country: c.country,
    count: c._count.id,
    netPay: countryPayMap[c.country] ?? 0,
  }))

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Organization-wide payroll insights</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Users className="w-5 h-5 text-blue-600" />}
          label="Active Employees"
          value={String(activeEmployees)}
          sub={`${totalEmployees} total`}
          bg="bg-blue-50"
        />
        <KpiCard
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          label="Latest Net Payroll"
          value={formatCurrency(latestRun?.totalNet ?? 0, 'USD')}
          sub={`${latestRun?.employeeCount ?? 0} employees`}
          bg="bg-green-50"
        />
        <KpiCard
          icon={<BarChart3 className="w-5 h-5 text-purple-600" />}
          label="Total Paid (All Time)"
          value={formatCurrency(totalPayroll, 'USD')}
          sub={`${payrollRuns.length} runs`}
          bg="bg-purple-50"
        />
        <KpiCard
          icon={<Globe className="w-5 h-5 text-orange-600" />}
          label="Countries"
          value={String(countryBreakdown.length)}
          sub="active payroll countries"
          bg="bg-orange-50"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payroll trend */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <CardTitle className="text-base">Payroll Trend</CardTitle>
            </div>
            <CardDescription>Net pay over the last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            {trendData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                No payroll data yet
              </div>
            ) : (
              <PayrollTrendChart data={trendData} />
            )}
          </CardContent>
        </Card>

        {/* Country breakdown */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-500" />
              <CardTitle className="text-base">By Country</CardTitle>
            </div>
            <CardDescription>Employee distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {countryData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                No employees yet
              </div>
            ) : (
              <CountryBreakdownChart data={countryData} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Country detail table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Country Breakdown</CardTitle>
          <CardDescription>Employees and recent payroll by country</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-medium text-gray-500 px-6 py-3">Country</th>
                  <th className="text-right font-medium text-gray-500 px-6 py-3">Employees</th>
                  <th className="text-right font-medium text-gray-500 px-6 py-3">Recent Net Pay</th>
                  <th className="text-right font-medium text-gray-500 px-6 py-3">Avg Net / Employee</th>
                </tr>
              </thead>
              <tbody>
                {countryData.map((c, i) => (
                  <tr key={c.country} className={i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs font-mono">{c.country}</Badge>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right font-medium">{c.count}</td>
                    <td className="px-6 py-3 text-right font-medium">
                      {c.netPay > 0 ? formatCurrency(c.netPay, 'USD') : '—'}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-500">
                      {c.netPay > 0 && c.count > 0 ? formatCurrency(c.netPay / c.count, 'USD') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({ icon, label, value, sub, bg }: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  bg: string
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} mb-3`}>
          {icon}
        </div>
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  )
}
