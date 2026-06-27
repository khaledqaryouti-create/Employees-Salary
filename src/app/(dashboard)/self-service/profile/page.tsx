import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { prisma } from '@/lib/prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/link-button'
import { ArrowLeft, User, Briefcase, Globe, DollarSign, CalendarDays } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils/format'

export default async function SelfServiceProfilePage() {
  const { user, orgId } = await getProfileOrRedirect()

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    include: { organization: true },
  })

  const employee = await prisma.employee.findFirst({
    where: { profileId: user.id, organizationId: orgId },
    include: {
      salaryStructure: true,
      leaveBalances: { include: { leaveType: true } },
      orgUnit: { select: { name: true } },
    },
  })

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <LinkButton variant="ghost" href="/self-service" size="sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Self Service
        </LinkButton>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
      </div>

      {/* Account Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" /> Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-4 pb-3 border-b">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-base">{profile?.fullName}</p>
              <p className="text-gray-500">{profile?.email}</p>
            </div>
            <Badge className="ml-auto bg-blue-100 text-blue-700">{profile?.role?.replaceAll('_', ' ')}</Badge>
          </div>
          {[
            { label: 'Organization', value: profile?.organization?.name ?? '—' },
            { label: 'Member Since', value: profile?.createdAt ? formatDate(profile.createdAt) : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {employee ? (
        <>
          {/* Employment Info */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-purple-600" /> Employment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { label: 'Employee Number', value: employee.employeeNumber },
                { label: 'Job Title', value: employee.jobTitle ?? '—' },
                { label: 'Department', value: employee.orgUnit?.name ?? '—' },
                { label: 'Employment Type', value: employee.employmentType },
                { label: 'Work Country', value: employee.country },
                { label: 'Join Date', value: formatDate(employee.joinDate) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Salary */}
          {employee.salaryStructure && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" /> Compensation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  { label: 'Basic Salary', value: formatCurrency(employee.salaryStructure.basicSalary, employee.salaryStructure.currency) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium font-mono">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Leave Balances */}
          {employee.leaveBalances.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-amber-600" /> Leave Balances
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-gray-100">
                  {employee.leaveBalances.map((bal) => (
                    <div key={bal.id} className="py-2.5 flex justify-between text-sm">
                      <span>{bal.leaveType.name}</span>
                      <div>
                        <span className="font-semibold">{(bal.totalDays - bal.usedDays - bal.pendingDays).toFixed(1)}</span>
                        <span className="text-gray-400 text-xs ml-1">/ {bal.totalDays} days</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-10 text-center text-gray-400">
            <Globe className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p>No employee record linked to your account yet.</p>
            <p className="text-xs mt-1">Contact your HR administrator.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
