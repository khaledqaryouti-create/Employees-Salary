import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { prisma } from '@/lib/prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/link-button'
import { FileText, CalendarDays, User, DollarSign, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default async function SelfServicePage() {
  const { profile, orgId } = await getProfileOrRedirect()

  const employee = await prisma.employee.findFirst({
    where: { profile: { id: profile.id }, organizationId: orgId },
    include: { salaryStructure: true, orgUnit: { select: { name: true } } },
  })

  const recentPayslips = employee
    ? await prisma.payrollItem.findMany({
        where: { employeeId: employee.id, hasError: false },
        include: {
          payrollRun: { select: { periodMonth: true, periodYear: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      })
    : []

  const pendingLeave = employee
    ? await prisma.leaveRequest.count({
        where: { employeeId: employee.id, status: 'PENDING' },
      })
    : 0

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Portal</h1>
        <p className="text-sm text-gray-500 mt-1">View your payslips, request leave, and update your details</p>
      </div>

      {employee ? (
        <>
          {/* Profile card */}
          <Card className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <User className="w-7 h-7 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-lg">{employee.fullName}</p>
                <p className="text-sm text-gray-500">{employee.jobTitle ?? 'Employee'} · {employee.orgUnit?.name ?? 'General'}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs">#{employee.employeeNumber}</Badge>
                  <Badge variant="secondary" className="text-xs">{employee.country}</Badge>
                  <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100">
                    {employee.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              {employee.salaryStructure && (
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-xs text-gray-400">Basic Salary</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(employee.salaryStructure.basicSalary, employee.salaryStructure.currency)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <QuickAction icon={<FileText />} label="My Payslips" href="/payslips" />
            <QuickAction icon={<CalendarDays />} label="Request Leave" href="/leave/new" count={pendingLeave} />
            <QuickAction icon={<DollarSign />} label="Pay History" href="/reports" />
            <QuickAction icon={<User />} label="My Profile" href="/self-service/profile" />
          </div>

          {/* Recent payslips */}
          {recentPayslips.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Recent Payslips</CardTitle>
                  <LinkButton href="/payslips" variant="ghost" size="sm">View All</LinkButton>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {recentPayslips.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium">
                        {MONTHS[item.payrollRun.periodMonth] ?? ''} {item.payrollRun.periodYear}
                      </p>
                      <p className="text-xs text-gray-400">
                        Net: {formatCurrency(item.netPay, employee.salaryStructure?.currency ?? 'USD')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100">
                        {item.payrollRun.status}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="text-center py-12">
            <User className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No employee record linked to your account</p>
            <p className="text-gray-400 text-sm mt-1">Contact your HR administrator to link your account</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface QuickActionProps {
  readonly icon: React.ReactNode
  readonly label: string
  readonly href: string
  readonly count?: number
}

function QuickAction({ icon, label, href, count }: QuickActionProps) {
  return (
    <LinkButton
      href={href}
      variant="outline"
      className="h-auto flex-col py-4 gap-2 relative hover:bg-blue-50 hover:border-blue-200"
    >
      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
        {icon}
      </div>
      <span className="text-xs text-center font-medium">{label}</span>
      {count && count > 0 ? (
        <span className="absolute top-2 right-2 w-5 h-5 bg-yellow-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
          {count}
        </span>
      ) : null}
    </LinkButton>
  )
}

