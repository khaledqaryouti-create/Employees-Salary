import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { prisma } from '@/lib/prisma/client'
import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Bot, Activity } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

const ACTION_COLORS: Record<string, string> = {
  EMPLOYEE_CREATED:    'bg-green-100 text-green-700',
  EMPLOYEE_UPDATED:    'bg-blue-100 text-blue-700',
  EMPLOYEES_IMPORTED:  'bg-teal-100 text-teal-700',
  SETTINGS_UPDATED:    'bg-purple-100 text-purple-700',
  ORG_LEVEL_CREATED:   'bg-indigo-100 text-indigo-700',
  ORG_LEVEL_UPDATED:   'bg-indigo-100 text-indigo-700',
  ORG_LEVEL_DELETED:   'bg-red-100 text-red-700',
  ORG_UNIT_CREATED:    'bg-indigo-100 text-indigo-700',
  ORG_UNIT_UPDATED:    'bg-indigo-100 text-indigo-700',
  ORG_UNIT_DELETED:    'bg-red-100 text-red-700',
  LEAVE_TYPE_CREATED:  'bg-amber-100 text-amber-700',
  LEAVE_TYPE_UPDATED:  'bg-amber-100 text-amber-700',
  LEAVE_TYPE_DELETED:  'bg-red-100 text-red-700',
  LEAVE_REQUESTED:     'bg-orange-100 text-orange-700',
  LEAVE_APPROVED:      'bg-green-100 text-green-700',
  LEAVE_REJECTED:      'bg-red-100 text-red-700',
  RULE_CREATED:        'bg-violet-100 text-violet-700',
  RULE_UPDATED:        'bg-violet-100 text-violet-700',
  RULE_DELETED:        'bg-red-100 text-red-700',
}

function actionLabel(action: string): string {
  return action
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default async function SystemLogsPage() {
  const { orgId } = await getProfileOrRedirect()
  const t = await getTranslations('settings')

  const [systemLogs, aiLogs, recentRuns] = await Promise.all([
    prisma.systemLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.aiAuditLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.payrollRun.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, name: true, status: true, createdAt: true, employeeCount: true },
    }),
  ])

  const STATUS_COLORS: Record<string, string> = {
    DRAFT:            'bg-gray-100 text-gray-600',
    PROCESSING:       'bg-yellow-100 text-yellow-700',
    COMPLETED:        'bg-green-100 text-green-700',
    FAILED:           'bg-red-100 text-red-700',
    APPROVED:         'bg-blue-100 text-blue-700',
    PAID:             'bg-purple-100 text-purple-700',
    PENDING_APPROVAL: 'bg-orange-100 text-orange-700',
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('systemLogsTitle')}</h1>
        <p className="text-gray-500 mt-1 text-sm">{t('systemLogsDesc')}</p>
      </div>

      {/* System Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            {t('activityLog')}
          </CardTitle>
          <CardDescription>
            {t('activityLogDesc', { count: systemLogs.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {systemLogs.length === 0 ? (
            <p className="text-sm text-gray-400">{t('noActivity')}</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {systemLogs.map((log) => {
                const detail = log.detail as Record<string, unknown> | null
                return (
                  <div key={log.id} className="flex items-start justify-between py-3 gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-xs shrink-0 ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                          {actionLabel(log.action)}
                        </Badge>
                        {log.entityType && (
                          <span className="text-xs text-gray-500">
                            {log.entityType}
                            {detail?.name ? `: ${String(detail.name)}` : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {log.actorEmail ? (
                          <><span className="font-medium text-gray-600">{log.actorEmail}</span> · </>
                        ) : null}
                        {formatDate(log.createdAt)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payroll Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            {t('payrollActivity')}
          </CardTitle>
          <CardDescription>{t('payrollActivityDesc', { count: recentRuns.length })}</CardDescription>
        </CardHeader>
        <CardContent>
          {recentRuns.length === 0 ? (
            <p className="text-sm text-gray-400">{t('noPayrollRuns')}</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentRuns.map((run) => (
                <div key={run.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-sm">{run.name ?? 'Unnamed Run'}</p>
                    <p className="text-xs text-gray-500">{formatDate(run.createdAt)} · {run.employeeCount} employees</p>
                  </div>
                  <Badge className={`text-xs ${STATUS_COLORS[run.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {run.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-600" />
            {t('aiUsageLogs')}
          </CardTitle>
          <CardDescription>{t('aiUsageLogsDesc', { count: aiLogs.length })}</CardDescription>
        </CardHeader>
        <CardContent>
          {aiLogs.length === 0 ? (
            <p className="text-sm text-gray-400">{t('noAiInteractions')}</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {aiLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{log.query ?? 'AI interaction'}</p>
                    <p className="text-xs text-gray-500">
                      User {log.userId.slice(0, 8)}… · {log.userRole} · {formatDate(log.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4 shrink-0">
                    {log.wasBlocked && <Badge className="text-xs bg-red-100 text-red-700">Blocked</Badge>}
                    {log.wasAnswered && <Badge className="text-xs bg-green-100 text-green-700">Answered</Badge>}
                    <Badge variant="outline" className="text-xs">{log.page ?? 'chat'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
