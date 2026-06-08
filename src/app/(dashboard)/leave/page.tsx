import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/link-button'
import { CalendarDays, Plus, ChevronRight, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

export default async function LeavePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile?.organizationId) redirect('/auth/login')

  const isEmployee = profile.role === 'EMPLOYEE'

  // HR sees all; employee sees own
  const employee = isEmployee
    ? await prisma.employee.findFirst({
        where: { profile: { id: profile.id }, organizationId: profile.organizationId },
        select: { id: true },
      })
    : null

  const requests = await prisma.leaveRequest.findMany({
    where: {
      ...(isEmployee && employee
        ? { employeeId: employee.id }
        : { employee: { organizationId: profile.organizationId } }),
    },
    include: {
      employee: { select: { fullName: true, employeeNumber: true } },
      leaveType: { select: { name: true, color: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave & Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">
            {pendingCount > 0 && (
              <span className="text-yellow-600 font-medium">{pendingCount} pending approval · </span>
            )}
            {requests.length} total requests
          </p>
        </div>
        <LinkButton href="/leave/new">
          <Plus className="w-4 h-4 mr-2" />
          Request Leave
        </LinkButton>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Leave Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="text-center py-16">
              <CalendarDays className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No leave requests yet</p>
              <LinkButton href="/leave/new" className="mt-6">Request Leave</LinkButton>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {requests.map((req) => {
                const days = Math.ceil(
                  (new Date(req.endDate).getTime() - new Date(req.startDate).getTime()) / (1000 * 60 * 60 * 24)
                ) + 1
                return (
                  <div key={req.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      {!isEmployee && (
                        <p className="font-medium text-sm text-gray-900">
                          {req.employee.fullName}
                          <span className="text-gray-400 font-normal text-xs ml-2">
                            #{req.employee.employeeNumber}
                          </span>
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: (req.leaveType.color ?? '#e5e7eb') + '33',
                            color: req.leaveType.color ?? '#374151',
                          }}
                        >
                          {req.leaveType.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          <Clock className="w-3 h-3 inline mr-0.5" />
                          {days} day{days !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(req.startDate)}
                          {req.endDate !== req.startDate && ` – ${formatDate(req.endDate)}`}
                        </span>
                      </div>
                      {req.reason && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{req.reason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <Badge className={`text-xs ${statusColors[req.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {req.status}
                      </Badge>
                      {!isEmployee && req.status === 'PENDING' && (
                        <LinkButton
                          href={`/leave/${req.id}/review`}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          Review
                        </LinkButton>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
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
