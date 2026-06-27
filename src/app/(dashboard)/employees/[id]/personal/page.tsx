import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { prisma } from '@/lib/prisma/client'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/link-button'
import {
  ArrowLeft, User, Briefcase, Globe,
  CalendarDays, Phone, Mail, Building2, ChevronRight,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

export default async function EmployeePersonalPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>
}>) {
  const { id } = await params
  const { orgId } = await getProfileOrRedirect()
  const t = await getTranslations('employees')
  const tc = await getTranslations('common')

  const EMPLOYMENT_TYPE_KEYS: Record<string, string> = {
    LOCAL: t('local'),
    EXPATRIATE: t('expatriate'),
    CONTRACT: t('contract'),
    PART_TIME: t('partTime'),
  }

  const employee = await prisma.employee.findFirst({
    where: { id, organizationId: orgId },
    include: {
      leaveBalances: { include: { leaveType: true } },
      orgUnit: {
        include: {
          level: true,
          parent: {
            include: {
              level: true,
              parent: {
                include: {
                  level: true,
                  parent: { include: { level: true } },
                },
              },
            },
          },
        },
      },
    },
  })
  if (!employee) notFound()

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <LinkButton href="/employees/personal" variant="ghost" size="sm">
        <ArrowLeft className="w-4 h-4 mr-1" /> {t('personalTitle')}
      </LinkButton>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
            <User className="w-7 h-7 text-blue-600" />
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
        <LinkButton href={`/employees/${id}/edit`} variant="outline" size="sm">
          {t('editEmployee')}
        </LinkButton>
      </div>

      {/* Company Structure Path */}
      {employee.orgUnit && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2.5 flex-wrap">
          <Building2 className="w-4 h-4 shrink-0 text-blue-500" />
          {(() => {
            const path: { name: string; levelName: string; color: string | null }[] = []
            type UnitWithParent = {
              name: string
              level: { name: string; color: string | null }
              parent: UnitWithParent | null
            }
            function collect(u: UnitWithParent | null) {
              if (!u) return
              collect(u.parent)
              path.push({ name: u.name, levelName: u.level.name, color: u.level.color })
            }
            collect(employee.orgUnit as UnitWithParent)
            return path.map((p, i) => (
              <span key={p.name} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="w-3 h-3 opacity-40" />}
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: p.color ?? '#6b7280' }}
                />
                <span className="text-xs text-muted-foreground">{p.levelName}:</span>
                <span className="font-medium text-foreground">{p.name}</span>
              </span>
            ))
          })()}
        </div>
      )}

      {/* Content */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Personal Details */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" /> {t('personalDetailsCard')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { icon: Mail,         label: tc('email'),             value: employee.email },
              { icon: Phone,        label: tc('phone'),             value: employee.phone ?? '—' },
              { icon: Globe,        label: t('nationality'),        value: employee.nationality ?? '—' },
              { icon: Globe,        label: t('workCountry'),        value: employee.country },
              { icon: CalendarDays, label: t('joinDate'),           value: formatDate(employee.joinDate) },
              { icon: Briefcase,    label: t('employmentType'),     value: EMPLOYMENT_TYPE_KEYS[employee.employmentType] ?? employee.employmentType },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-gray-500 w-36 shrink-0">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Leave Balances */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-amber-600" /> {t('leaveBalances')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {employee.leaveBalances.length === 0 ? (
              <p className="text-sm text-gray-400">{t('noLeaveBalances')}</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {employee.leaveBalances.map((bal) => (
                  <div key={bal.id} className="py-2.5 flex justify-between text-sm">
                    <span className="text-gray-700">{bal.leaveType.name}</span>
                    <div className="text-right">
                      <span className="font-semibold">{(bal.totalDays - bal.usedDays - bal.pendingDays).toFixed(1)}</span>
                      <span className="text-gray-400 text-xs ml-1">/ {bal.totalDays} {t('daysAllocated')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
