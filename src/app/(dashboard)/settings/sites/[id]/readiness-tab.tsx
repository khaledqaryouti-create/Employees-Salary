'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2, XCircle, AlertTriangle, Loader2, ShieldAlert, FileDown, RefreshCw,
} from 'lucide-react'
import type { ReadinessResult, DvrSetup, GateItem } from './types'

function severityIcon(item: GateItem) {
  if (item.passed) return <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
  if (item.severity === 'CRITICAL') return <XCircle className="w-4 h-4 text-red-600 shrink-0" />
  if (item.severity === 'MANDATORY') return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
  return <AlertTriangle className="w-4 h-4 text-gray-400 shrink-0" />
}

function GateCard({ title, items }: { title: string; items: GateItem[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="divide-y">
          {items.map((item) => (
            <div key={item.key} className="flex items-start gap-2.5 py-2.5">
              {severityIcon(item)}
              <div>
                <p className={`text-sm font-medium ${item.passed ? 'text-gray-900' : 'text-gray-700'}`}>{item.label}</p>
                {!item.passed && item.reason && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.reason}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface ReadinessTabProps {
  siteId:             string
  readiness:          ReadinessResult | null
  readinessError?:    string | null
  dvr:                DvrSetup | null
  onChanged:          () => void
  onRetryReadiness?:  () => void
}

export function ReadinessTab({ siteId, readiness, readinessError, dvr, onRetryReadiness }: ReadinessTabProps) {
  const t = useTranslations('sites')
  const [generatingDvr, setGeneratingDvr] = useState(false)

  async function generateDvr() {
    setGeneratingDvr(true)
    try {
      const res = await fetch(`/api/sites/${siteId}/dvr/generate-document`, { method: 'POST' })
      if (!res.ok) {
        const json = await res.json() as { message?: string }
        toast.error(json.message ?? t('riskAssessment.generateError'))
        return
      }
      const blob     = await res.blob()
      const url      = URL.createObjectURL(blob)
      const a        = document.createElement('a')
      const filename = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'DVR.pdf'
      a.href         = url
      a.download     = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t('riskAssessment.generateSuccess'))
    } catch {
      toast.error(t('riskAssessment.generateError'))
    } finally {
      setGeneratingDvr(false)
    }
  }

  if (!dvr) {
    return <p className="text-center text-gray-400 py-12">{t('noDvr')}</p>
  }

  if (readinessError) {
    return (
      <div className="flex flex-col items-center py-16 gap-3 text-center">
        <XCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm font-medium text-gray-700">Failed to load readiness data</p>
        <p className="text-xs text-gray-400 max-w-md">{readinessError}</p>
        {onRetryReadiness && (
          <Button variant="outline" size="sm" onClick={onRetryReadiness}>Retry</Button>
        )}
      </div>
    )
  }

  if (!readiness) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {onRetryReadiness && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onRetryReadiness} className="flex items-center gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      )}

      {/* Summary banner */}
      <Card className={readiness.overallPassed ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className={`w-6 h-6 ${readiness.overallPassed ? 'text-green-600' : 'text-amber-600'}`} />
              <div>
                <p className="font-semibold text-gray-900">
                  {readiness.overallPassed ? t('readinessPassed') : t('readinessBlocked')}
                </p>
                <p className="text-sm text-gray-600">
                  {t('gateSummary', { critical: readiness.criticalBlockers, mandatory: readiness.mandatoryMissing })}
                </p>
              </div>
            </div>
            <span className="text-sm font-medium px-3 py-1.5 rounded bg-white border">
              {t(`status.${dvr.status}`)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Gate cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <GateCard title={t('gate1Title')} items={readiness.gate1.items} />
        <GateCard title={t('gate2Title')} items={readiness.gate2.items} />
        <GateCard title={t('gate3Title')} items={readiness.gate3?.items ?? []} />
        <GateCard title={t('gate4Title')} items={readiness.gate4?.items ?? []} />
        <GateCard title={t('gate5Title')} items={readiness.gate5?.items ?? []} />
        <GateCard title={t('gate6Title')} items={readiness.gate6?.items ?? []} />
        <GateCard title="Gate 7 — Training Coverage (Art. 37)" items={readiness.gate7?.items ?? []} />
        {readiness.gate7?.groupCoverage && readiness.gate7.groupCoverage.length > 0 && (
          <div className="mt-1 border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Group</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 w-28">Training Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {readiness.gate7.groupCoverage.map((g) => (
                  <tr key={g.groupId} className="bg-white">
                    <td className="px-3 py-2 text-gray-700">{g.groupCode} — {g.groupName}</td>
                    <td className="px-3 py-2">
                      {g.hasTrained
                        ? <span className="text-green-700 font-medium">Covered</span>
                        : <span className="text-red-600 font-medium">Missing</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate DVR button */}
      {readiness.gate6?.passed && (
        <div className="flex justify-end">
          <Button
            onClick={() => void generateDvr()}
            disabled={generatingDvr}
            className="flex items-center gap-2 bg-green-700 hover:bg-green-800"
          >
            {generatingDvr
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <FileDown className="w-4 h-4" />}
            {t('riskAssessment.generateDvr')}
          </Button>
        </div>
      )}
    </div>
  )
}
