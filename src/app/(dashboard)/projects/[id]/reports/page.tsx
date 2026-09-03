'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ChevronLeft, Loader2, Download, BarChart3 } from 'lucide-react'

// Heavy chart components loaded client-side only
const DynamicCharts = dynamic(() => import('./project-charts'), { ssr: false, loading: () => (
  <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
) })

interface CostDist {
  id: string
  periodStart: string
  periodEnd: string
  allocatedCost: string
  employee: { id: string; fullName: string }
}

interface BudgetLine {
  id: string
  category: string
  plannedAmount: string
  periodStart: string
}

interface ReportData {
  distributions: CostDist[]
  budgetLines: BudgetLine[]
  projectName: string
  currency: string
}

export default function ProjectReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('projects')
  const [data, setData]       = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const [costsRes, projRes] = await Promise.all([
          fetch(`/api/projects/${id}/costs`),
          fetch(`/api/projects/${id}`),
        ])
        const costsJson = await costsRes.json() as { ok: boolean; data: { distributions: CostDist[] } }
        const projJson  = await projRes.json()  as { ok: boolean; data: { name: string; currency: string; budgetLines: BudgetLine[] } }
        if (costsJson.ok && projJson.ok) {
          setData({
            distributions: costsJson.data.distributions,
            budgetLines:   projJson.data.budgetLines,
            projectName:   projJson.data.name,
            currency:      projJson.data.currency,
          })
        }
      } catch {
        toast.error(t('errorLoading'))
      } finally {
        setLoading(false)
      }
    })()
  }, [id, t])

  async function handleExport(format: 'xlsx' | 'pdf') {
    setExporting(true)
    try {
      const res = await fetch(`/api/projects/${id}/export?format=${format}`)
      if (!res.ok) { toast.error(t('errorExporting')); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `project-report.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error(t('errorExporting'))
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${id}`} className="text-gray-400 hover:text-gray-600">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold">{data?.projectName} — {t('reports')}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={exporting} onClick={() => void handleExport('xlsx')}>
            <Download className="w-4 h-4 mr-1.5" />
            Excel
          </Button>
          <Button size="sm" variant="outline" disabled={exporting} onClick={() => void handleExport('pdf')}>
            <Download className="w-4 h-4 mr-1.5" />
            PDF
          </Button>
        </div>
      </div>

      {data && data.distributions.length > 0 ? (
        <DynamicCharts distributions={data.distributions} budgetLines={data.budgetLines} currency={data.currency} t={t} />
      ) : (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t('noCosts')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
