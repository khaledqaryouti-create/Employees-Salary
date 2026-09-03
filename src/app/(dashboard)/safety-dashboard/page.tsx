'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, ShieldCheck, AlertTriangle, AlertOctagon, Building2, FileDown, HardHat } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts'
import { Button } from '@/components/ui/button'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Branch { id: string; name: string }

interface DashboardData {
  totals: {
    sites:         number
    approvedSites: number
    openActions:   number
    openIncidents: number
  }
  branches:       Branch[]
  dvrCounts:      { status: string; count: number }[]
  actionCounts:   { priority: string; status: string; count: number }[]
  trainingCounts: { status: string; count: number }[]
  incidentCounts: { incidentType: string; status: string; count: number }[]
  trend:          { month: string; incidents: number; actions: number }[]
  sites: {
    id:              string
    name:            string
    city:            string | null
    dvrStatus:       string
    safetyScore:     number
    actions:         number
    incidents:       number
    trainingValid:   number
    trainingTotal:   number
    contractors:     number
    expiringPermits: number
  }[]
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const DVR_STATUS_LABEL: Record<string, string> = {
  SETUP:                     'Setup',
  DATA_COLLECTION:           'Data Collection',
  READINESS_REVIEW:          'Readiness Review',
  ASSESSMENT_IN_PROGRESS:    'Assessment',
  CONSULTATION_AND_APPROVAL: 'Consultation',
  APPROVED_AND_MONITORED:    'Approved',
}

const DVR_STATUS_COLOR: Record<string, string> = {
  SETUP:                     '#94a3b8',
  DATA_COLLECTION:           '#3b82f6',
  READINESS_REVIEW:          '#f59e0b',
  ASSESSMENT_IN_PROGRESS:    '#8b5cf6',
  CONSULTATION_AND_APPROVAL: '#6366f1',
  APPROVED_AND_MONITORED:    '#22c55e',
}

const DVR_STATUS_BADGE: Record<string, string> = {
  SETUP:                     'bg-gray-100 text-gray-600',
  DATA_COLLECTION:           'bg-blue-50 text-blue-700',
  READINESS_REVIEW:          'bg-amber-50 text-amber-700',
  ASSESSMENT_IN_PROGRESS:    'bg-purple-50 text-purple-700',
  CONSULTATION_AND_APPROVAL: 'bg-indigo-50 text-indigo-700',
  APPROVED_AND_MONITORED:    'bg-green-50 text-green-700',
}

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#ca8a04', LOW: '#22c55e',
}

const INCIDENT_TYPE_LABEL: Record<string, string> = {
  ACCIDENT:             'Accident',
  NEAR_MISS:            'Near Miss',
  DANGEROUS_OCCURRENCE: 'Dangerous Occ.',
  OCCUPATIONAL_DISEASE: 'Occ. Disease',
}

const INCIDENT_TYPE_COLOR: Record<string, string> = {
  ACCIDENT:             '#dc2626',
  NEAR_MISS:            '#ea580c',
  DANGEROUS_OCCURRENCE: '#8b5cf6',
  OCCUPATIONAL_DISEASE: '#f59e0b',
}

// ─── Period presets ───────────────────────────────────────────────────────────

type Period = '30d' | '90d' | '6m' | '1y' | 'all'

function periodDates(period: Period): { from?: string; to?: string } {
  if (period === 'all') return {}
  const to   = new Date()
  const from = new Date()
  if (period === '30d')  from.setDate(from.getDate() - 30)
  if (period === '90d')  from.setDate(from.getDate() - 90)
  if (period === '6m')   from.setMonth(from.getMonth() - 6)
  if (period === '1y')   from.setFullYear(from.getFullYear() - 1)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

// ─── Score badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 75
    ? 'bg-green-100 text-green-700'
    : score >= 50
      ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>
      {score}/100
    </span>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon, color,
}: { label: string; value: number | string; sub?: string; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200', green: 'bg-green-50 border-green-200',
    amber: 'bg-amber-50 border-amber-200', red: 'bg-red-50 border-red-200',
  }
  return (
    <div className={`rounded-xl border p-5 flex items-center gap-4 ${colors[color] ?? 'bg-gray-50 border-gray-200'}`}>
      <div className="text-2xl">{icon}</div>
      <div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-700 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm">
      <div className="px-5 py-4 border-b">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function DvrStatusPanel({ counts, total }: { counts: { status: string; count: number }[]; total: number }) {
  const ORDER = ['SETUP','DATA_COLLECTION','READINESS_REVIEW','ASSESSMENT_IN_PROGRESS','CONSULTATION_AND_APPROVAL','APPROVED_AND_MONITORED']
  return (
    <div className="space-y-3">
      {ORDER.map((status) => {
        const count = counts.find((c) => c.status === status)?.count ?? 0
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <div key={status}>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>{DVR_STATUS_LABEL[status] ?? status}</span>
              <span className="font-medium">{count} site{count !== 1 ? 's' : ''} ({pct}%)</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: DVR_STATUS_COLOR[status] ?? '#94a3b8' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TrainingPanel({ counts }: { counts: { status: string; count: number }[] }) {
  const get = (s: string) => counts.find((c) => c.status === s)?.count ?? 0
  const valid    = get('VALID')
  const expiring = get('EXPIRING_SOON')
  const expired  = get('EXPIRED')
  const total    = valid + expiring + expired
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{valid}</p>
          <p className="text-xs text-green-600 mt-0.5">Valid</p>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
          <p className="text-2xl font-bold text-amber-700">{expiring}</p>
          <p className="text-xs text-amber-600 mt-0.5">Expiring Soon</p>
        </div>
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{expired}</p>
          <p className="text-xs text-red-600 mt-0.5">Expired</p>
        </div>
      </div>
      {total > 0 && (
        <div className="h-2 rounded-full overflow-hidden flex gap-0.5">
          {valid > 0    && <div className="bg-green-500 rounded-l-full" style={{ flex: valid }} />}
          {expiring > 0 && <div className="bg-amber-400" style={{ flex: expiring }} />}
          {expired > 0  && <div className="bg-red-500 rounded-r-full" style={{ flex: expired }} />}
        </div>
      )}
      <p className="text-xs text-gray-500 text-center">{total} total training records</p>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SafetyDashboardPage() {
  const t = useTranslations('safetyDashboard')

  const [data, setData]         = useState<DashboardData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [err, setErr]           = useState<string | null>(null)
  const [period, setPeriod]     = useState<Period>('all')
  const [branchId, setBranchId] = useState<string>('')
  const [exporting, setExporting] = useState(false)

  const buildParams = useCallback(() => {
    const params = new URLSearchParams()
    const { from, to } = periodDates(period)
    if (from) params.set('from', from)
    if (to)   params.set('to', to)
    if (branchId) params.set('branchId', branchId)
    return params.toString()
  }, [period, branchId])

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const qs   = buildParams()
      const res  = await fetch(`/api/safety-dashboard${qs ? `?${qs}` : ''}`)
      const json = await res.json() as { ok: boolean; data: DashboardData; message?: string }
      if (json.ok) setData(json.data)
      else setErr(json.message ?? 'Failed to load dashboard')
    } catch {
      setErr('Failed to load safety dashboard')
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  useEffect(() => { void load() }, [load])

  async function handleExportPdf() {
    setExporting(true)
    try {
      const qs  = buildParams()
      const res = await fetch(`/api/safety-report/pdf${qs ? `?${qs}` : ''}`)
      if (!res.ok) { toast.error('Failed to generate PDF'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `Safety_Report_${new Date().toISOString().slice(0, 10)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF report downloaded')
    } catch {
      toast.error('Failed to export PDF')
    } finally {
      setExporting(false)
    }
  }

  // ── Chart data ──────────────────────────────────────────────────────────────

  const actionsByPriority = data
    ? ['CRITICAL','HIGH','MEDIUM','LOW'].map((priority) => ({
        priority,
        open: data.actionCounts
          .filter((r) => r.priority === priority && ['OPEN','IN_PROGRESS','OVERDUE'].includes(r.status))
          .reduce((s, r) => s + r.count, 0),
        completed: data.actionCounts
          .filter((r) => r.priority === priority && r.status === 'COMPLETED')
          .reduce((s, r) => s + r.count, 0),
      }))
    : []

  const incidentsByType = data
    ? Object.entries(INCIDENT_TYPE_LABEL).map(([type, label]) => ({
        type, label,
        count: data.incidentCounts.filter((r) => r.incidentType === type).reduce((s, r) => s + r.count, 0),
      })).filter((r) => r.count > 0)
    : []

  const PERIOD_OPTIONS: { key: Period; label: string }[] = [
    { key: 'all', label: t('filters.allTime') },
    { key: '30d', label: t('filters.last30') },
    { key: '90d', label: t('filters.last90') },
    { key: '6m',  label: t('filters.last6m') },
    { key: '1y',  label: t('filters.last1y') },
  ]

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-7 h-7 animate-spin text-gray-400" />
      </div>
    )
  }

  if (err || !data) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {err ?? 'No data available.'}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
        </div>
        <Button type="button" onClick={handleExportPdf} disabled={exporting} variant="outline" className="flex items-center gap-2">
          <FileDown className="w-4 h-4" />
          {exporting ? t('filters.exporting') : t('filters.export')}
        </Button>
      </div>

      {/* Filter bar */}
      <div className="bg-white border rounded-xl p-4 flex flex-wrap items-center gap-3">
        {/* Branch filter */}
        {data.branches.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">{t('filters.branch')}:</label>
            <select
              className="text-sm border rounded-md px-3 py-1.5"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              <option value="">{t('filters.allBranches')}</option>
              {data.branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Period presets */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">{t('filters.period')}:</label>
          <div className="flex gap-1">
            {PERIOD_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                  period === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('stats.totalSites')}     value={data.totals.sites}         icon={<Building2  className="w-6 h-6 text-blue-600"  />} color="blue" />
        <StatCard
          label={t('stats.dvrApproved')}
          value={data.totals.approvedSites}
          sub={data.totals.sites > 0 ? `${Math.round((data.totals.approvedSites / data.totals.sites) * 100)}% of sites` : undefined}
          icon={<ShieldCheck className="w-6 h-6 text-green-600" />}
          color="green"
        />
        <StatCard label={t('stats.openActions')}    value={data.totals.openActions}   icon={<AlertTriangle className="w-6 h-6 text-amber-600" />} color="amber" />
        <StatCard label={t('stats.openIncidents')}  value={data.totals.openIncidents} icon={<AlertOctagon  className="w-6 h-6 text-red-600"   />} color="red" />
      </div>

      {/* DVR + Actions row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title={t('sections.dvrStatus')}>
          <DvrStatusPanel counts={data.dvrCounts} total={data.totals.sites} />
        </SectionCard>

        <SectionCard title={t('sections.actionsByPriority')}>
          {actionsByPriority.every((r) => r.open === 0 && r.completed === 0) ? (
            <p className="text-sm text-gray-400 text-center py-6">No corrective actions yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={actionsByPriority} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="priority" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="open" name="Open" radius={[4, 4, 0, 0]}>
                  {actionsByPriority.map((entry) => (
                    <Cell key={entry.priority} fill={PRIORITY_COLOR[entry.priority] ?? '#94a3b8'} />
                  ))}
                </Bar>
                <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* Training + Incidents row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title={t('sections.training')}>
          <TrainingPanel counts={data.trainingCounts} />
        </SectionCard>

        <SectionCard title={t('sections.incidentsByType')}>
          {incidentsByType.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No incidents recorded yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={incidentsByType} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Incidents" radius={[4, 4, 0, 0]}>
                  {incidentsByType.map((entry) => (
                    <Cell key={entry.type} fill={INCIDENT_TYPE_COLOR[entry.type] ?? '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* Trend chart */}
      <SectionCard title={t('sections.trend')}>
        {data.trend.every((r) => r.incidents === 0 && r.actions === 0) ? (
          <p className="text-sm text-gray-400 text-center py-6">No trend data for this period</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.trend} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="incidents" name="Incidents"      stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="actions"   name="New Actions"    stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* Per-site table */}
      <SectionCard title={t('sections.siteDetail')}>
        {data.sites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <Building2 className="w-8 h-8 mb-2" />
            <p className="text-sm">No active sites found.</p>
            <Link href="/settings/sites" className="text-sm text-blue-600 hover:underline mt-1">Go to Sites</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('table.site')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('table.dvrStatus')}</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">{t('table.score')}</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">{t('table.actions')}</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">{t('table.incidents')}</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">{t('table.training')}</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">{t('table.contractors')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.sites.map((site) => {
                  const trainingPct = site.trainingTotal > 0
                    ? `${Math.round((site.trainingValid / site.trainingTotal) * 100)}%`
                    : '—'
                  return (
                    <tr key={site.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/settings/sites/${site.id}`} className="font-medium text-blue-600 hover:underline">
                          {site.name}
                        </Link>
                        {site.city && <p className="text-xs text-gray-500">{site.city}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${DVR_STATUS_BADGE[site.dvrStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                          {DVR_STATUS_LABEL[site.dvrStatus] ?? site.dvrStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ScoreBadge score={site.safetyScore} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-semibold ${site.actions > 0 ? 'text-orange-600' : 'text-gray-400'}`}>{site.actions}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-semibold ${site.incidents > 0 ? 'text-red-600' : 'text-gray-400'}`}>{site.incidents}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">{trainingPct}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="flex items-center justify-center gap-1 text-sm text-gray-600">
                          <HardHat className="w-3.5 h-3.5 text-gray-400" />
                          {site.contractors}
                          {site.expiringPermits > 0 && (
                            <span className="ml-1 text-xs text-amber-600 font-medium">({site.expiringPermits} exp.)</span>
                          )}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <p className="text-xs text-gray-400 text-center pb-4">
        Data is live — refresh the page to update.
      </p>
    </div>
  )
}
