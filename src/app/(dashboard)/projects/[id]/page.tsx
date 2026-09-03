'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  FolderKanban, Users, ShieldCheck, DollarSign, BarChart3,
  Pencil, ChevronLeft, ChevronDown, Loader2, Plus, CheckCircle2, Circle,
  ExternalLink, FileText, Download,
} from 'lucide-react'

type Tab = 'overview' | 'resources' | 'safety' | 'budget' | 'costs'

interface Assignment {
  id: string
  role: string
  allocationPct: string | null
  hoursPerWeek: string | null
  startDate: string
  endDate: string | null
  status: string
  employee: { id: string; fullName: string; employeeNumber: string }
}

interface SafetyReq {
  id: string
  title: string
  description: string | null
  mandatory: boolean
  completedAt: string | null
  completedBy: { id: string; fullName: string } | null
}

interface BudgetLine {
  id: string
  category: string
  plannedAmount: string
  periodStart: string
  periodEnd: string
}

interface Project {
  id: string
  code: string
  name: string
  clientName: string | null
  status: string
  startDate: string
  endDate: string | null
  budgetAmount: string | null
  currency: string
  costCenter: string | null
  billable: boolean
  allocationMode: string
  overheadFormula: string | null
  projectType: string | null
  countryId: string | null
  manager: { id: string; fullName: string } | null
  orgUnit: { id: string; name: string } | null
  resourceAssignments: Assignment[]
  safetyRequirements: SafetyReq[]
  budgetLines: BudgetLine[]
  _count: { costDistributions: number; assetAssignments: number }
}

interface SafetyChecklistItem {
  id: string
  status: string
  dueDate: string | null
  completedDate: string | null
  notes: string | null
  evidenceFileUrl: string | null
  verifiedByProfessional: boolean
  verifiedByName: string | null
  assignedTo: { id: string; fullName: string } | null
  requirement: {
    id: string
    title: string
    description: string
    legalReference: string
    category: string
    mandatory: boolean
    recurring: boolean
    recurrenceMonths: number | null
    requiredRole: string | null
    requiredDocument: string | null
    triggerCondition: string | null
  }
}

const STATUS_COLOR: Record<string, string> = {
  PLANNING:  'bg-gray-100 text-gray-700',
  ACTIVE:    'bg-green-100 text-green-700',
  ON_HOLD:   'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

const CHECKLIST_STATUS_STYLE: Record<string, string> = {
  NOT_STARTED:    'text-gray-600',
  IN_PROGRESS:    'text-blue-700',
  DONE:           'text-green-700',
  NOT_APPLICABLE: 'text-gray-400 line-through',
}

function ChecklistStatusIcon({ status }: { status: string }) {
  if (status === 'DONE')        return <CheckCircle2 className="w-4 h-4 text-green-600" />
  if (status === 'IN_PROGRESS') return <Circle className="w-4 h-4 text-blue-500" />
  if (status === 'NOT_APPLICABLE') return <Circle className="w-4 h-4 text-gray-200" />
  return <Circle className="w-4 h-4 text-gray-300" />
}

function groupByCategory(items: SafetyChecklistItem[]) {
  return items.reduce<Record<string, SafetyChecklistItem[]>>((acc, item) => {
    const cat = item.requirement.category
    if (!acc[cat]) acc[cat] = []
    acc[cat]!.push(item)
    return acc
  }, {})
}

// Renders the expanded detail panel for a single checklist item
function ChecklistItemDetail({
  item, editNotes, editEvidence, saving, generatingDoc,
  setEditNotes, setEditEvidence, onSave, onGenerateDoc, t,
}: {
  item: SafetyChecklistItem
  editNotes: string
  editEvidence: string
  saving: boolean
  generatingDoc: boolean
  setEditNotes: (v: string) => void
  setEditEvidence: (v: string) => void
  onSave: () => void
  onGenerateDoc: () => void
  t: ReturnType<typeof useTranslations<'projects'>>
}) {
  return (
    <div className="border-t px-4 py-3 space-y-3 bg-gray-50 rounded-b-lg">
      {item.requirement.description && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-0.5">{t('description')}</p>
          <p className="text-sm text-gray-700">{item.requirement.description}</p>
        </div>
      )}
      {item.requirement.requiredDocument && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-0.5">{t('requiredDocument')}</p>
          <button
            type="button"
            onClick={onGenerateDoc}
            disabled={generatingDoc}
            className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-1 hover:bg-blue-100 disabled:opacity-50 cursor-pointer transition-colors"
          >
            {generatingDoc
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <FileText className="w-3 h-3" />
            }
            {item.requirement.requiredDocument}
            {!generatingDoc && <Download className="w-3 h-3 ml-0.5 text-blue-500" />}
          </button>
        </div>
      )}
      {item.requirement.triggerCondition && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-0.5">{t('triggerCondition')}</p>
          <code className="text-xs bg-gray-100 text-gray-700 rounded px-2 py-0.5">{item.requirement.triggerCondition}</code>
        </div>
      )}
      {item.requirement.recurring && item.requirement.recurrenceMonths && (
        <p className="text-xs text-purple-600">
          {t('recurrence', { months: item.requirement.recurrenceMonths })}
        </p>
      )}
      {item.status === 'DONE' && item.completedDate && (
        <p className="text-xs text-green-600">
          {t('completedOn')}: {new Date(item.completedDate).toLocaleDateString()}
        </p>
      )}
      {item.verifiedByName && (
        <p className="text-xs text-green-700">{t('verifiedByNameLabel')}: {item.verifiedByName}</p>
      )}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-1">{t('notes')}</p>
        <textarea
          value={editNotes}
          onChange={(e) => setEditNotes(e.target.value)}
          rows={3}
          placeholder={t('notesPlaceholder')}
          className="w-full border rounded-md px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-1">{t('evidenceUrl')}</p>
        <div className="flex items-center gap-2">
          <Input
            value={editEvidence}
            onChange={(e) => setEditEvidence(e.target.value)}
            placeholder="https://..."
            className="text-sm h-8"
          />
          {editEvidence && (
            <a href={editEvidence} target="_blank" rel="noopener noreferrer" className="text-blue-600 shrink-0">
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
          {t('saveDetails')}
        </Button>
      </div>
    </div>
  )
}

// Renders a single checklist row with expand/collapse
function ChecklistItemRow({
  item, projectId, onCycle, onSaveDetail, t,
}: {
  item: SafetyChecklistItem
  projectId: string
  onCycle: (item: SafetyChecklistItem) => void
  onSaveDetail: (itemId: string, notes: string, evidenceFileUrl: string) => Promise<void>
  t: ReturnType<typeof useTranslations<'projects'>>
}) {
  const [expanded, setExpanded]         = useState(false)
  const [editNotes, setEditNotes]       = useState(item.notes ?? '')
  const [editEvidence, setEditEvidence] = useState(item.evidenceFileUrl ?? '')
  const [saving, setSaving]             = useState(false)
  const [generatingDoc, setGeneratingDoc] = useState(false)

  const isNA     = item.status === 'NOT_APPLICABLE'
  const titleCls = CHECKLIST_STATUS_STYLE[item.status] ?? 'text-gray-600'

  async function handleSave() {
    setSaving(true)
    try {
      await onSaveDetail(item.id, editNotes, editEvidence)
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerateDoc() {
    setGeneratingDoc(true)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/safety-checklist/${item.id}/generate-document`,
        { method: 'POST' }
      )
      if (!res.ok) {
        toast.error(t('generateDocumentError'))
        return
      }
      const blob     = await res.blob()
      const url      = URL.createObjectURL(blob)
      const anchor   = document.createElement('a')
      anchor.href     = url
      anchor.download = `${(item.requirement.requiredDocument ?? 'safety-document').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error(t('generateDocumentError'))
    } finally {
      setGeneratingDoc(false)
    }
  }

  return (
    <div className={`rounded-lg border ${isNA ? 'opacity-50' : ''}`}>
      <div className={`flex items-start gap-3 p-3 ${!isNA ? 'hover:bg-gray-50' : ''}`}>
        <button type="button" onClick={() => onCycle(item)} className="mt-0.5 shrink-0">
          <ChecklistStatusIcon status={item.status} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${titleCls}`}>{item.requirement.title}</span>
            {item.requirement.mandatory && <Badge variant="destructive" className="text-xs py-0">M</Badge>}
            {item.requirement.recurring  && <Badge variant="outline"    className="text-xs py-0">R</Badge>}
            {isNA && <Badge variant="secondary" className="text-xs py-0">N/A</Badge>}
            {item.verifiedByProfessional && <span title={t('verifiedByPro')} className="text-green-600">🛡</span>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{t('legalRef')}: {item.requirement.legalReference}</p>
          {item.requirement.requiredRole && (
            <p className="text-xs text-blue-600 mt-0.5">{t('requiredRole')}: {item.requirement.requiredRole}</p>
          )}
          {item.dueDate && (
            <p className="text-xs text-gray-500 mt-0.5">Due: {new Date(item.dueDate).toLocaleDateString()}</p>
          )}
          {item.assignedTo && (
            <p className="text-xs text-gray-500 mt-0.5">{t('assignedTo')}: {item.assignedTo.fullName}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto shrink-0 text-gray-400 hover:text-gray-600 mt-0.5"
          aria-label={expanded ? 'Collapse details' : 'Expand details'}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {expanded && (
        <ChecklistItemDetail
          item={item}
          editNotes={editNotes}
          editEvidence={editEvidence}
          saving={saving}
          generatingDoc={generatingDoc}
          setEditNotes={setEditNotes}
          setEditEvidence={setEditEvidence}
          onSave={() => void handleSave()}
          onGenerateDoc={() => void handleGenerateDoc()}
          t={t}
        />
      )}
    </div>
  )
}

interface ChecklistSectionProps {
  checklist: SafetyChecklistItem[]
  meta: { mandatoryTotal: number; mandatoryComplete: number }
  hasProjectType: boolean
  hasCountry: boolean
  loading: boolean
  generating: boolean
  projectId: string
  onGenerate: () => void
  onCycle: (item: SafetyChecklistItem) => void
  onSaveDetail: (itemId: string, notes: string, evidenceFileUrl: string) => Promise<void>
  t: ReturnType<typeof useTranslations<'projects'>>
}

function ChecklistSection({ checklist, meta, hasProjectType, hasCountry, loading, generating, projectId, onGenerate, onCycle, onSaveDetail, t }: ChecklistSectionProps) {
  if (!hasProjectType || !hasCountry) {
    return <p className="text-sm text-gray-400 text-center py-8">{t('noChecklistPrompt')}</p>
  }
  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
  }
  if (checklist.length === 0) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-sm text-gray-400">{t('noChecklist')}</p>
        <Button size="sm" onClick={onGenerate} disabled={generating}>
          {generating && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
          {t('generateChecklist')}
        </Button>
      </div>
    )
  }
  const pct = meta.mandatoryTotal > 0
    ? Math.round((meta.mandatoryComplete / meta.mandatoryTotal) * 100)
    : 0
  const grouped = groupByCategory(checklist)

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>{t('checklistProgress', { done: meta.mandatoryComplete, total: meta.mandatoryTotal })}</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{cat.replace(/_/g, ' ')}</p>
          <div className="space-y-2">
            {items.map((item) => (
              <ChecklistItemRow
                key={item.id}
                item={item}
                projectId={projectId}
                onCycle={onCycle}
                onSaveDetail={onSaveDetail}
                t={t}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('projects')

  const [project, setProject]                 = useState<Project | null>(null)
  const [loading, setLoading]                 = useState(true)
  const [tab, setTab]                         = useState<Tab>('overview')
  const [showAddResource, setShowAddResource] = useState(false)
  const [showAddSafety, setShowAddSafety]     = useState(false)
  const [checklist, setChecklist]             = useState<SafetyChecklistItem[]>([])
  const [checklistMeta, setChecklistMeta]     = useState({ mandatoryTotal: 0, mandatoryComplete: 0 })
  const [checklistLoading, setChecklistLoading] = useState(false)
  const [generating, setGenerating]           = useState(false)
  const [showSendChecklist, setShowSendChecklist] = useState(false)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const res  = await fetch(`/api/projects/${id}`)
        const json = await res.json() as { ok: boolean; data: Project }
        if (json.ok) setProject(json.data)
        else toast.error(t('errorLoading'))
      } catch {
        toast.error(t('errorLoading'))
      } finally {
        setLoading(false)
      }
    })()
  }, [id, t])

  async function fetchChecklist() {
    setChecklistLoading(true)
    try {
      const res  = await fetch(`/api/projects/${id}/safety-checklist`)
      const json = await res.json() as {
        ok: boolean
        data: { items: SafetyChecklistItem[]; mandatoryTotal: number; mandatoryComplete: number }
      }
      if (json.ok) {
        setChecklist(json.data.items)
        setChecklistMeta({
          mandatoryTotal:    json.data.mandatoryTotal,
          mandatoryComplete: json.data.mandatoryComplete,
        })
      }
    } catch { /* silent */ } finally {
      setChecklistLoading(false)
    }
  }

  async function generateChecklist() {
    setGenerating(true)
    try {
      const res  = await fetch(`/api/projects/${id}/safety-checklist/generate`, { method: 'POST' })
      const json = await res.json() as { ok: boolean; message?: string }
      if (json.ok) {
        toast.success(t('checklistGenerated'))
        await fetchChecklist()
      } else {
        toast.error(json.message ?? t('checklistGenerateError'))
      }
    } catch {
      toast.error(t('checklistGenerateError'))
    } finally {
      setGenerating(false)
    }
  }

  async function saveItemDetail(itemId: string, notes: string, evidenceFileUrl: string) {
    try {
      const res  = await fetch(`/api/projects/${id}/safety-checklist/${itemId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ notes: notes || null, evidenceFileUrl: evidenceFileUrl || null }),
      })
      const json = await res.json() as { ok: boolean }
      if (json.ok) {
        toast.success(t('detailsSaved'))
        await fetchChecklist()
      } else {
        toast.error(t('errorUpdating'))
      }
    } catch {
      toast.error(t('errorUpdating'))
    }
  }

  async function cycleChecklistItemStatus(item: SafetyChecklistItem) {
    const cycle: Record<string, string> = {
      NOT_STARTED: 'IN_PROGRESS',
      IN_PROGRESS: 'DONE',
      DONE:        'NOT_STARTED',
    }
    const newStatus = cycle[item.status] ?? 'NOT_STARTED'
    try {
      const res  = await fetch(`/api/projects/${id}/safety-checklist/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json() as { ok: boolean }
      if (json.ok) {
        setChecklist((prev) => prev.map((i) => i.id === item.id ? { ...i, status: newStatus } : i))
        setChecklistMeta((m) => {
          const wasDone = item.status === 'DONE'
          const nowDone = newStatus === 'DONE'
          if (!item.requirement.mandatory) return m
          return {
            ...m,
            mandatoryComplete: m.mandatoryComplete + (nowDone ? 1 : wasDone ? -1 : 0),
          }
        })
      }
    } catch { /* silent */ }
  }

  useEffect(() => {
    if (tab === 'safety' && checklist.length === 0) {
      void fetchChecklist()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  async function markSafetyComplete(reqId: string, currentlyDone: boolean) {
    try {
      const res  = await fetch(`/api/projects/${id}/safety/${reqId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completedAt:   currentlyDone ? null : new Date().toISOString(),
          completedById: null,
        }),
      })
      const json = await res.json() as { ok: boolean }
      if (json.ok) {
        setProject((prev) => prev ? {
          ...prev,
          safetyRequirements: prev.safetyRequirements.map((r) =>
            r.id === reqId ? { ...r, completedAt: currentlyDone ? null : new Date().toISOString() } : r
          ),
        } : prev)
        toast.success(currentlyDone ? t('safetyUncompleted') : t('safetyCompleted'))
      }
    } catch {
      toast.error(t('errorUpdating'))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6 text-center text-gray-400">
        <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>{t('notFound')}</p>
      </div>
    )
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',  label: t('tabs.overview'),   icon: <FolderKanban className="w-4 h-4" /> },
    { id: 'resources', label: t('tabs.resources'),  icon: <Users className="w-4 h-4" /> },
    { id: 'safety',    label: t('tabs.safety'),     icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'budget',    label: t('tabs.budget'),     icon: <DollarSign className="w-4 h-4" /> },
    { id: 'costs',     label: t('tabs.costs'),      icon: <BarChart3 className="w-4 h-4" /> },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb & actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="text-gray-400 hover:text-gray-600">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{project.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[project.status] ?? 'bg-gray-100 text-gray-700'}`}>
                {t(`status.${project.status}`)}
              </span>
            </div>
            <p className="text-sm text-gray-500 font-mono">{project.code}</p>
          </div>
        </div>
        <Link href={`/projects/${id}/edit`}>
          <Button variant="outline" size="sm" className="flex items-center gap-1.5">
            <Pencil className="w-3.5 h-3.5" />
            {t('edit')}
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            type="button"
            onClick={() => setTab(tb.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
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

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">{t('projectInfo')}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {project.clientName && <Row label={t('client')} value={project.clientName} />}
              {project.manager    && <Row label={t('pm')} value={project.manager.fullName} />}
              {project.orgUnit    && <Row label={t('department')} value={project.orgUnit.name} />}
              {project.costCenter && <Row label={t('costCenter')} value={project.costCenter} />}
              <Row label={t('allocationMode')} value={t(project.allocationMode === 'PERCENTAGE' ? 'allocationPercent' : 'allocationHours')} />
              <Row label={t('billable')} value={project.billable ? t('yes') : t('no')} />
              {project.overheadFormula && <Row label={t('overheadFormula')} value={project.overheadFormula} mono />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">{t('timeline')}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label={t('startDate')} value={new Date(project.startDate).toLocaleDateString()} />
              {project.endDate && <Row label={t('endDate')} value={new Date(project.endDate).toLocaleDateString()} />}
              {project.budgetAmount && (
                <Row
                  label={t('budget')}
                  value={`${Number(project.budgetAmount).toLocaleString()} ${project.currency}`}
                />
              )}
              <Row label={t('resources')} value={String(project.resourceAssignments.length)} />
              <Row label={t('safetyItems')} value={String(project.safetyRequirements.length)} />
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'resources' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t('tabs.resources')}</CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-1.5"
                onClick={() => setShowAddResource(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                {t('addResource')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {project.resourceAssignments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{t('noResources')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 font-medium">{t('employee')}</th>
                      <th className="pb-2 font-medium">{t('role')}</th>
                      <th className="pb-2 font-medium">{t('allocation')}</th>
                      <th className="pb-2 font-medium">{t('period')}</th>
                      <th className="pb-2 font-medium">{t('assignmentStatus')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {project.resourceAssignments.map((a) => (
                      <tr key={a.id} className="py-2">
                        <td className="py-2.5">{a.employee.fullName}</td>
                        <td className="py-2.5 text-gray-600">{a.role}</td>
                        <td className="py-2.5">
                          {a.allocationPct ? `${a.allocationPct}%` : a.hoursPerWeek ? `${a.hoursPerWeek}h/w` : '—'}
                        </td>
                        <td className="py-2.5 text-gray-500">
                          {new Date(a.startDate).toLocaleDateString()}
                          {a.endDate && ` – ${new Date(a.endDate).toLocaleDateString()}`}
                        </td>
                        <td className="py-2.5">
                          <Badge variant="outline" className="text-xs">{a.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'safety' && (
        <div className="space-y-4">
          {/* Auto-generated checklist */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  {t('checklistTitle')}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {checklist.length > 0 && (
                    <Button size="sm" variant="outline" onClick={() => setShowSendChecklist(true)}>
                      {t('sendChecklist')}
                    </Button>
                  )}
                  {(project.projectType && project.countryId) && (
                    <Button size="sm" variant="outline" onClick={() => void generateChecklist()} disabled={generating}>
                      {generating && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                      {checklist.length > 0 ? t('refreshChecklist') : t('generateChecklist')}
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-1">
                ⚠️ {t('checklistDisclaimer')}
              </p>
            </CardHeader>
            <CardContent>
              <ChecklistSection
                checklist={checklist}
                meta={checklistMeta}
                hasProjectType={!!project.projectType}
                hasCountry={!!project.countryId}
                loading={checklistLoading}
                generating={generating}
                projectId={id}
                onGenerate={() => void generateChecklist()}
                onCycle={(item) => void cycleChecklistItemStatus(item)}
                onSaveDetail={(itemId, notes, evidence) => saveItemDetail(itemId, notes, evidence)}
                t={t}
              />
            </CardContent>
          </Card>

          {/* Manual safety items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t('manualSafetyTitle')}</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1.5"
                  onClick={() => setShowAddSafety(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('addSafetyReq')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {project.safetyRequirements.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">{t('noSafetyItems')}</p>
              ) : (
                <div className="space-y-3">
                  {project.safetyRequirements.map((req) => (
                    <div key={req.id} className="flex items-start gap-3 p-3 rounded-lg border">
                      <button
                        type="button"
                        onClick={() => void markSafetyComplete(req.id, !!req.completedAt)}
                        className="mt-0.5 shrink-0"
                      >
                        {req.completedAt
                          ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                          : <Circle className="w-5 h-5 text-gray-300" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium ${req.completedAt ? 'line-through text-gray-400' : ''}`}>
                            {req.title}
                          </p>
                          {req.mandatory && <Badge variant="destructive" className="text-xs">{t('mandatory')}</Badge>}
                        </div>
                        {req.description && <p className="text-xs text-gray-500 mt-0.5">{req.description}</p>}
                        {req.completedAt && req.completedBy && (
                          <p className="text-xs text-green-600 mt-1">
                            {t('completedBy', { name: req.completedBy.fullName, date: new Date(req.completedAt).toLocaleDateString() })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'budget' && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t('tabs.budget')}</CardTitle></CardHeader>
          <CardContent>
            {project.budgetLines.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{t('noBudgetLines')}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">{t('category')}</th>
                    <th className="pb-2 font-medium">{t('plannedAmount')}</th>
                    <th className="pb-2 font-medium">{t('period')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {project.budgetLines.map((line) => (
                    <tr key={line.id}>
                      <td className="py-2.5">
                        <Badge variant="outline">{t(`category.${line.category}`)}</Badge>
                      </td>
                      <td className="py-2.5">{Number(line.plannedAmount).toLocaleString()}</td>
                      <td className="py-2.5 text-gray-500">
                        {new Date(line.periodStart).toLocaleDateString()} – {new Date(line.periodEnd).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'costs' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t('tabs.costs')}</CardTitle>
              <CostRecalculateButton projectId={id} t={t} />
            </div>
          </CardHeader>
          <CardContent>
            <CostDistributionsView projectId={id} t={t} />
          </CardContent>
        </Card>
      )}

      {showAddResource && project && (
        <AddResourceDialog
          projectId={id}
          allocationMode={project.allocationMode}
          open={showAddResource}
          onClose={() => setShowAddResource(false)}
          onAdded={(assignment) => {
            setProject((prev) => prev ? {
              ...prev,
              resourceAssignments: [assignment, ...prev.resourceAssignments],
            } : prev)
            setShowAddResource(false)
          }}
        />
      )}

      {showAddSafety && (
        <AddSafetyDialog
          projectId={id}
          open={showAddSafety}
          onClose={() => setShowAddSafety(false)}
          onAdded={(req) => {
            setProject((prev) => prev ? {
              ...prev,
              safetyRequirements: [req, ...prev.safetyRequirements],
            } : prev)
            setShowAddSafety(false)
          }}
        />
      )}

      {showSendChecklist && (
        <SendChecklistDialog
          projectId={id}
          open={showSendChecklist}
          onClose={() => setShowSendChecklist(false)}
          t={t}
        />
      )}
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className={`font-medium text-right ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}

interface CostDist {
  id: string
  periodStart: string
  periodEnd: string
  allocatedCost: string
  snapshotAllocationPct: string | null
  employee: { id: string; fullName: string }
}

function CostDistributionsView({ projectId, t }: { projectId: string; t: ReturnType<typeof useTranslations<'projects'>> }) {
  const [dists, setDists]     = useState<CostDist[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const res  = await fetch(`/api/projects/${projectId}/costs`)
        const json = await res.json() as { ok: boolean; data: { distributions: CostDist[] } }
        if (json.ok) setDists(json.data.distributions)
      } catch { /* silent */ } finally {
        setLoading(false)
      }
    })()
  }, [projectId])

  if (loading) return <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
  if (dists.length === 0) return <p className="text-sm text-gray-400 text-center py-8">{t('noCosts')}</p>

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-gray-500">
          <th className="pb-2 font-medium">{t('employee')}</th>
          <th className="pb-2 font-medium">{t('period')}</th>
          <th className="pb-2 font-medium">{t('allocation')}</th>
          <th className="pb-2 font-medium">{t('allocatedCost')}</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {dists.map((d) => (
          <tr key={d.id}>
            <td className="py-2.5">{d.employee.fullName}</td>
            <td className="py-2.5 text-gray-500">
              {new Date(d.periodStart).toLocaleDateString()} – {new Date(d.periodEnd).toLocaleDateString()}
            </td>
            <td className="py-2.5">{d.snapshotAllocationPct ? `${d.snapshotAllocationPct}%` : '—'}</td>
            <td className="py-2.5 font-medium">{Number(d.allocatedCost).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

interface EmployeeOption { id: string; fullName: string; employeeNumber: string }

interface AddResourceDialogProps {
  projectId: string
  allocationMode: string
  open: boolean
  onClose: () => void
  onAdded: (assignment: Assignment) => void
}

function AddResourceDialog({ projectId, allocationMode, open, onClose, onAdded }: AddResourceDialogProps) {
  const t = useTranslations('projects')
  const [employees, setEmployees]   = useState<EmployeeOption[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [employeeId,   setEmployeeId]   = useState('')
  const [role,         setRole]         = useState('')
  const [allocationPct, setAllocationPct] = useState('')
  const [hoursPerWeek, setHoursPerWeek] = useState('')
  const [billableRate, setBillableRate] = useState('')
  const [startDate,    setStartDate]    = useState('')
  const [endDate,      setEndDate]      = useState('')
  const [status,       setStatus]       = useState('APPROVED')

  useEffect(() => {
    void (async () => {
      try {
        const res  = await fetch('/api/employees?limit=100')
        const json = await res.json() as { ok: boolean; data: { data: EmployeeOption[] } }
        if (json.ok) setEmployees(json.data.data ?? [])
      } catch { /* silent */ }
    })()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId || !role || !startDate) {
      toast.error(t('validationRequired'))
      return
    }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        employeeId,
        role,
        startDate,
        status,
        ...(endDate       ? { endDate }                           : {}),
        ...(billableRate  ? { billableRate: Number(billableRate) } : {}),
      }
      if (allocationMode === 'PERCENTAGE' && allocationPct) {
        body.allocationPct = Number(allocationPct)
      } else if (allocationMode === 'HOURS' && hoursPerWeek) {
        body.hoursPerWeek = Number(hoursPerWeek)
      }

      const res  = await fetch(`/api/projects/${projectId}/assignments`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const json = await res.json() as {
        ok: boolean
        data?: { assignment: Assignment; overAllocationWarning?: string }
        message?: string
      }

      if (!json.ok) {
        toast.error(json.message ?? t('errorCreating'))
        return
      }

      if (json.data?.overAllocationWarning) {
        toast.warning(json.data.overAllocationWarning)
      }
      toast.success(t('resourceAdded'))
      if (json.data?.assignment) onAdded(json.data.assignment)
    } catch {
      toast.error(t('errorCreating'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t('addResource')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ar-employee">{t('employee')}</Label>
            <select
              id="ar-employee"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('selectEmployee')}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.employeeNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ar-role">{t('role')}</Label>
            <Input
              id="ar-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder={t('rolePlaceholder')}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {allocationMode === 'PERCENTAGE' ? (
              <div className="space-y-1.5">
                <Label htmlFor="ar-alloc">{t('allocationPct')}</Label>
                <Input
                  id="ar-alloc"
                  type="number"
                  min="0"
                  max="200"
                  step="0.5"
                  value={allocationPct}
                  onChange={(e) => setAllocationPct(e.target.value)}
                  placeholder="100"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="ar-hours">{t('hoursPerWeek')}</Label>
                <Input
                  id="ar-hours"
                  type="number"
                  min="0"
                  step="0.5"
                  value={hoursPerWeek}
                  onChange={(e) => setHoursPerWeek(e.target.value)}
                  placeholder="40"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="ar-rate">{t('billableRate')}</Label>
              <Input
                id="ar-rate"
                type="number"
                min="0"
                step="0.01"
                value={billableRate}
                onChange={(e) => setBillableRate(e.target.value)}
                placeholder={t('optional')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ar-start">{t('startDate')}</Label>
              <Input
                id="ar-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ar-end">{t('endDate')}</Label>
              <Input
                id="ar-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ar-status">{t('assignmentStatus')}</Label>
            <select
              id="ar-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {t('addResource')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface AddSafetyDialogProps {
  projectId: string
  open: boolean
  onClose: () => void
  onAdded: (req: SafetyReq) => void
}

function AddSafetyDialog({ projectId, open, onClose, onAdded }: AddSafetyDialogProps) {
  const t = useTranslations('projects')
  const [submitting, setSubmitting] = useState(false)
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [mandatory,   setMandatory]   = useState(true)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      toast.error(t('validationRequired'))
      return
    }
    setSubmitting(true)
    try {
      const res  = await fetch(`/api/projects/${projectId}/safety`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: title.trim(), description: description.trim() || undefined, mandatory }),
      })
      const json = await res.json() as { ok: boolean; data?: SafetyReq; message?: string }
      if (!json.ok) {
        toast.error(json.message ?? t('errorCreating'))
        return
      }
      toast.success(t('safetyAdded'))
      if (json.data) onAdded(json.data)
    } catch {
      toast.error(t('errorCreating'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            {t('addSafetyReq')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sf-title">{t('safetyTitle')}</Label>
            <Input
              id="sf-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('safetyTitlePlaceholder')}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sf-desc">{t('description')}</Label>
            <textarea
              id="sf-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={t('optional')}
              className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="sf-mandatory"
              type="checkbox"
              checked={mandatory}
              onChange={(e) => setMandatory(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="sf-mandatory" className="cursor-pointer">
              {t('mandatory')}
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {t('addSafetyReq')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface SendChecklistDialogProps {
  projectId: string
  open:      boolean
  onClose:   () => void
  t:         ReturnType<typeof useTranslations<'projects'>>
}

function SendChecklistDialog({ projectId, open, onClose, t }: SendChecklistDialogProps) {
  const [emailInput, setEmailInput] = useState('')
  const [sending, setSending]       = useState(false)
  const [validationError, setValidationError] = useState('')

  function parseEmails(raw: string): string[] {
    return raw.split(',').map((e) => e.trim()).filter(Boolean)
  }

  function isValidEmail(e: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  }

  async function handleSend(ev: React.FormEvent) {
    ev.preventDefault()
    const emails = parseEmails(emailInput)
    if (emails.length === 0) {
      setValidationError('Enter at least one email address.')
      return
    }
    const invalid = emails.find((e) => !isValidEmail(e))
    if (invalid) {
      setValidationError(`Invalid address: ${invalid}`)
      return
    }
    setValidationError('')
    setSending(true)
    try {
      const res  = await fetch(`/api/projects/${projectId}/safety-checklist/send-email`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ emails }),
      })
      const json = await res.json() as { ok: boolean; data?: { sent: number }; message?: string }
      if (!json.ok) {
        toast.error(json.message ?? t('sendError'))
        return
      }
      toast.success(t('checklistSent', { count: json.data?.sent ?? emails.length }))
      onClose()
    } catch {
      toast.error(t('sendError'))
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            {t('sendChecklistDialog')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSend(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sc-emails">{t('emailAddresses')}</Label>
            <textarea
              id="sc-emails"
              value={emailInput}
              onChange={(e) => { setEmailInput(e.target.value); setValidationError('') }}
              rows={3}
              placeholder={t('emailAddressesHint')}
              className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {validationError && (
              <p className="text-xs text-red-600">{validationError}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={sending}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={sending}>
              {sending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {sending ? t('sending') : t('sendChecklist')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CostRecalculateButton({ projectId: _projectId, t }: { projectId: string; t: ReturnType<typeof useTranslations<'projects'>> }) {
  const [loading, setLoading] = useState(false)
  async function recalculate() {
    setLoading(true)
    try {
      const now   = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      await fetch('/api/projects/costs/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart: start.toISOString(),
          periodEnd:   end.toISOString(),
        }),
      })
      toast.success(t('recalculateQueued'))
    } catch {
      toast.error(t('errorRecalculating'))
    } finally {
      setLoading(false)
    }
  }
  return (
    <Button size="sm" variant="outline" disabled={loading} onClick={() => void recalculate()}>
      {loading && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
      {t('recalculate')}
    </Button>
  )
}
