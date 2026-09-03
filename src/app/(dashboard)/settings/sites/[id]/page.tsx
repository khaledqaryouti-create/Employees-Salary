'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  Building2, ChevronLeft, Loader2, Users, ShieldCheck, ClipboardCheck,
  ListTodo, Wrench, BarChart3, ClipboardList, GraduationCap, BadgeCheck,
  AlertOctagon, HardHat,
} from 'lucide-react'

import type { SiteDetail, ReadinessResult } from './types'
import { OverviewTab }           from './overview-tab'
import { SafetyRolesTab }        from './safety-roles-tab'
import { WorkerGroupsTab }       from './worker-groups-tab'
import { ReadinessTab }          from './readiness-tab'
import { TasksTab }              from './tasks-tab'
import { EquipmentTab }          from './equipment-tab'
import { RiskAssessmentTab }     from './risk-assessment-tab'
import { CorrectiveActionsTab }  from './corrective-actions-tab'
import { IncidentsTab }          from './incidents-tab'
import { TrainingTab }           from './training-tab'
import { ApprovalTab }           from './approval-tab'
import { ContractorsTab }       from './contractors-tab'

type Tab = 'overview' | 'safetyRoles' | 'workerGroups' | 'tasks' | 'equipment' | 'riskAssessment' | 'actions' | 'incidents' | 'training' | 'approval' | 'readiness' | 'contractors'

export default function SiteDetailPage() {
  const t      = useTranslations('sites')
  const params = useParams<{ id: string }>()
  const id     = params.id

  const [site, setSite]         = useState<SiteDetail | null>(null)
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null)
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<Tab>('overview')

  const loadSite = useCallback(async () => {
    try {
      const res  = await fetch(`/api/sites/${id}`)
      const json = await res.json() as { ok: boolean; data: SiteDetail }
      if (json.ok) setSite(json.data)
      else toast.error(t('errorLoading'))
    } catch {
      toast.error(t('errorLoading'))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  const [readinessError, setReadinessError] = useState<string | null>(null)

  const loadReadiness = useCallback(async () => {
    setReadinessError(null)
    try {
      const res = await fetch(`/api/sites/${id}/dvr/readiness`)

      // Redirected to login page — session expired
      if (res.redirected || !res.headers.get('content-type')?.includes('application/json')) {
        setReadinessError('Session expired — please reload the page to log in again.')
        return
      }

      const json = await res.json() as { ok: boolean; data: ReadinessResult; message?: string }
      if (json.ok) {
        setReadiness(json.data)
      } else {
        setReadinessError(json.message ?? `Server error ${res.status}`)
      }
    } catch (err) {
      setReadinessError(err instanceof Error ? err.message : 'Failed to load readiness')
    }
  }, [id])

  // Chain readiness after site so that if the Supabase session needs a
  // refresh, loadSite() handles it first; loadReadiness() then has fresh
  // cookies and avoids the single-use refresh-token race condition.
  useEffect(() => {
    void loadSite().then(() => void loadReadiness())
  }, [loadSite, loadReadiness])

  function refreshAll() {
    void loadSite()
    void loadReadiness()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!site) {
    return (
      <div className="p-6 text-center text-gray-400">
        <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>{t('notFound')}</p>
      </div>
    )
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',     label: t('tabs.overview'),     icon: <Building2 className="w-4 h-4" /> },
    { id: 'safetyRoles',  label: t('tabs.safetyRoles'),  icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'workerGroups', label: t('tabs.workerGroups'), icon: <Users className="w-4 h-4" /> },
    { id: 'tasks',           label: t('tabs.tasks'),           icon: <ListTodo className="w-4 h-4" /> },
    { id: 'equipment',       label: t('tabs.equipment'),       icon: <Wrench className="w-4 h-4" /> },
    { id: 'riskAssessment',  label: t('tabs.riskAssessment'),  icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'actions',         label: t('tabs.actions'),         icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'incidents',       label: t('tabs.incidents'),       icon: <AlertOctagon className="w-4 h-4" /> },
    { id: 'training',        label: t('tabs.training'),        icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'approval',        label: t('tabs.approval'),        icon: <BadgeCheck className="w-4 h-4" /> },
    { id: 'contractors',     label: t('tabs.contractors'),     icon: <HardHat className="w-4 h-4" /> },
    { id: 'readiness',       label: t('tabs.readiness'),       icon: <ClipboardCheck className="w-4 h-4" /> },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings/sites" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{site.name}</h1>
          <p className="text-sm text-gray-500">{site.legalEntityName ?? t('noLegalEntity')}</p>
        </div>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            type="button"
            onClick={() => setTab(tb.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === tb.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tb.icon}
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'overview'     && <OverviewTab site={site} onSaved={refreshAll} />}
      {tab === 'safetyRoles'  && <SafetyRolesTab siteId={id} roles={site.safetyRoles} onChanged={refreshAll} />}
      {tab === 'workerGroups' && <WorkerGroupsTab siteId={id} groups={site.workerGroups} onChanged={refreshAll} />}
      {tab === 'tasks'           && <TasksTab siteId={id} groups={site.workerGroups} onChanged={refreshAll} />}
      {tab === 'equipment'       && <EquipmentTab siteId={id} onChanged={refreshAll} />}
      {tab === 'riskAssessment'  && <RiskAssessmentTab siteId={id} />}
      {tab === 'actions'         && <CorrectiveActionsTab siteId={id} />}
      {tab === 'incidents'       && <IncidentsTab siteId={id} />}
      {tab === 'training'        && <TrainingTab siteId={id} workerGroups={site.workerGroups} />}
      {tab === 'approval'        && (
        <ApprovalTab siteId={id} dvr={site.dvr} safetyRoles={site.safetyRoles} onChanged={loadSite} />
      )}
      {tab === 'contractors'    && <ContractorsTab siteId={id} />}
      {tab === 'readiness'    && (
        <ReadinessTab
          siteId={id}
          readiness={readiness}
          readinessError={readinessError}
          dvr={site.dvr}
          onChanged={refreshAll}
          onRetryReadiness={() => void loadReadiness()}
        />
      )}
    </div>
  )
}
