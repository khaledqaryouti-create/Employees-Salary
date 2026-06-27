import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { prisma } from '@/lib/prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/link-button'
import { Play, Plus, ChevronRight, Calendar, Users, DollarSign } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { getTranslations } from 'next-intl/server'

const statusColorMap: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  PROCESSING: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-purple-100 text-purple-700',
}

export default async function PayrollPage() {
  const { orgId } = await getProfileOrRedirect()
  const t = await getTranslations('payroll')

  const [runs, sumResult, countResult] = await Promise.all([
    prisma.payrollRun.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.payrollRun.aggregate({
      where: { organizationId: orgId, status: 'PAID' },
      _sum: { totalNet: true },
    }),
    prisma.payrollRun.count({
      where: { organizationId: orgId, status: 'PAID' },
    }),
  ])

  const statusLabel: Record<string, string> = {
    DRAFT: t('draft'),
    PROCESSING: t('processing'),
    PENDING_APPROVAL: t('pendingApproval'),
    APPROVED: t('approved'),
    PAID: t('paid'),
    FAILED: t('failed'),
    COMPLETED: t('completed'),
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('payrollRuns')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('paidRunsSummary', { count: countResult, total: formatCurrency(sumResult._sum.totalNet ?? 0, 'USD') })}
          </p>
        </div>
        <LinkButton href="/payroll/new">
          <Plus className="w-4 h-4 mr-2" />
          {t('newRun')}
        </LinkButton>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Play className="w-5 h-5 text-yellow-500" />}
          label={t('inProgress')}
          value={String(runs.filter((r) => r.status === 'PROCESSING').length)}
          bg="bg-yellow-50"
        />
        <StatCard
          icon={<Calendar className="w-5 h-5 text-blue-500" />}
          label={t('awaitingApproval')}
          value={String(runs.filter((r) => r.status === 'PENDING_APPROVAL').length)}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5 text-green-500" />}
          label={t('totalPaidAllTime')}
          value={formatCurrency(sumResult._sum.totalNet ?? 0, 'USD')}
          bg="bg-green-50"
        />
      </div>

      {/* Runs list */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t('recentRuns')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {runs.length === 0 ? (
            <div className="text-center py-16">
              <Play className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">{t('noRuns')}</p>
              <p className="text-gray-400 text-sm mt-1">{t('noRunsDesc')}</p>
              <LinkButton href="/payroll/new" className="mt-6">{t('startFirst')}</LinkButton>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {runs.map((run) => (
                <LinkButton
                  key={run.id}
                  href={`/payroll/${run.id}`}
                  variant="ghost"
                  className="w-full justify-start h-auto py-4 px-6 rounded-none hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between w-full gap-4">
                    <div className="min-w-0 flex-1 text-left">
                      <p className="font-medium text-gray-900">
                        {run.name ?? `Payroll – ${run.periodMonth}/${run.periodYear}`}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">
                          <Calendar className="w-3 h-3 inline mr-0.5" />
                          {formatDate(run.createdAt)}
                        </span>
                        <span className="text-xs text-gray-400">
                          <Users className="w-3 h-3 inline mr-0.5" />
                          {t('employeesCount', { count: run._count.items })}
                        </span>
                        {run.totalNet != null && (
                          <span className="text-xs text-gray-600 font-medium">
                            {formatCurrency(run.totalNet, run.currency ?? 'USD')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge className={`text-xs ${statusColorMap[run.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {statusLabel[run.status] ?? run.status}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                </LinkButton>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface StatCardProps {
  readonly icon: React.ReactNode
  readonly label: string
  readonly value: string
  readonly bg: string
}

function StatCard({ icon, label, value, bg }: StatCardProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
