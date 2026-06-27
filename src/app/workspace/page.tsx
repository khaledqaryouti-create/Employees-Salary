import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { prisma } from '@/lib/prisma/client'
import { LinkButton } from '@/components/ui/link-button'
import {
  Users,
  Calculator,
  Clock,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Activity,
} from 'lucide-react'
import WorkspaceHeader from './workspace-header'

export default async function WorkspacePage() {
  const { profile, orgId } = await getProfileOrRedirect()

  const firstName = profile.fullName?.split(' ')[0] ?? 'there'
  const now = new Date()

  const [pendingLeaves, currentPayrollRun] = await Promise.all([
    prisma.leaveRequest.count({
      where: { employee: { organizationId: orgId }, status: 'PENDING' },
    }),
    prisma.payrollRun.findFirst({
      where: {
        organizationId: orgId,
        periodYear: now.getFullYear(),
        periodMonth: now.getMonth() + 1,
      },
      orderBy: { createdAt: 'desc' },
      select: { status: true, periodYear: true, periodMonth: true },
    }),
  ])

  const payrollStatusLabel: Record<string, string> = {
    DRAFT: 'Draft',
    PROCESSING: 'Processing',
    PENDING_APPROVAL: 'Pending approval',
    APPROVED: 'Approved',
    PAID: 'Paid',
    FAILED: 'Failed',
    COMPLETED: 'Completed',
  }

  const currentMonthName = now.toLocaleString('default', { month: 'long' })

  const hour = now.getHours()
  let greeting: string
  if (hour < 12) greeting = 'Good morning'
  else if (hour < 18) greeting = 'Good afternoon'
  else greeting = 'Good evening'

  const dateLabel = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const hasActivity = pendingLeaves > 0 || !!currentPayrollRun

  return (
    <div className="relative overflow-hidden flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/60 to-indigo-100">
      {/* Decorative background blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none" />

      <WorkspaceHeader
        userName={profile.fullName}
        userEmail={profile.email}
        userRole={profile.role}
        organizationName={profile.organization?.name}
      />

      <main className="relative flex-1 flex flex-col items-center justify-center px-4 py-8 lg:py-10">
        <div className="w-full max-w-4xl space-y-6">

          {/* Welcome */}
          <div className="text-center space-y-2">
            <p className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
              {greeting} · {dateLabel}
            </p>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back,{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {firstName}
              </span>
            </h1>
            <p className="text-gray-500">
              Select the workspace you want to access
            </p>
          </div>

          {/* Workspace cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* HR Command Center */}
            <div className="rounded-2xl overflow-hidden bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
              {/* Horizontal gradient header band */}
              <div className="flex items-center gap-4 p-5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold leading-tight">HR Command Center</h2>
                  <p className="text-blue-100 text-xs mt-0.5">People, performance &amp; growth</p>
                </div>
              </div>

              {/* Card body */}
              <div className="p-5 flex flex-col flex-1 gap-4">
                <div className="grid grid-cols-2 gap-2">
                  {['Workforce mgmt', 'Recruitment', 'Performance', 'Succession'].map((f) => (
                    <div key={f} className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg px-2.5 py-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <div className="mt-auto">
                  <LinkButton href="/dashboard" className="w-full justify-center gap-2">
                    Open HR Workspace
                    <ArrowRight className="w-4 h-4" />
                  </LinkButton>
                </div>
              </div>
            </div>

            {/* Payroll */}
            <div className="rounded-2xl overflow-hidden bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
              {/* Horizontal gradient header band */}
              <div className="flex items-center gap-4 p-5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <Calculator className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold leading-tight">Payroll</h2>
                  <p className="text-emerald-100 text-xs mt-0.5">Compensation, benefits &amp; reports</p>
                </div>
              </div>

              {/* Card body */}
              <div className="p-5 flex flex-col flex-1 gap-4">
                <div className="grid grid-cols-2 gap-2">
                  {['Payroll processing', 'Salary & deductions', 'Benefits', 'Reports'].map((f) => (
                    <div key={f} className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg px-2.5 py-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <div className="mt-auto">
                  <LinkButton
                    href="/payroll"
                    className="w-full justify-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    Open Payroll Workspace
                    <ArrowRight className="w-4 h-4" />
                  </LinkButton>
                </div>
              </div>
            </div>

          </div>

          {/* Recent activity */}
          {hasActivity && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <Activity className="w-4 h-4 text-gray-400" />
                Recent activity
              </h2>
              <div className="space-y-2">
                {pendingLeaves > 0 && (
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-amber-50 rounded-xl">
                    <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <span className="text-sm text-gray-700">
                      {pendingLeaves} leave request{pendingLeaves > 1 ? 's' : ''} awaiting approval
                    </span>
                  </div>
                )}
                {currentPayrollRun && (
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-blue-50 rounded-xl">
                    <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <span className="text-sm text-gray-700">
                      {currentMonthName} payroll —{' '}
                      {payrollStatusLabel[currentPayrollRun.status] ?? currentPayrollRun.status.toLowerCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
