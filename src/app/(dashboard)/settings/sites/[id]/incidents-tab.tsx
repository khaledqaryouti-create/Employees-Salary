'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Plus, Trash2, Pencil, AlertTriangle, CheckCircle2,
  Clock, Zap, Loader2, AlertOctagon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Incident, IncidentType, IncidentStatus } from './types'

interface Props { siteId: string }

// ─── Constants ────────────────────────────────────────────────────────────────

type Filter = 'ALL' | IncidentType | 'OPEN' | 'CLOSED'

const TYPE_STYLE: Record<string, string> = {
  ACCIDENT:              'bg-red-100 text-red-800 border border-red-200',
  NEAR_MISS:             'bg-orange-100 text-orange-800 border border-orange-200',
  DANGEROUS_OCCURRENCE:  'bg-purple-100 text-purple-800 border border-purple-200',
  OCCUPATIONAL_DISEASE:  'bg-yellow-100 text-yellow-800 border border-yellow-200',
}

const SEVERITY_STYLE: Record<string, string> = {
  FATAL:         'bg-red-200 text-red-900 border border-red-300',
  MAJOR:         'bg-red-100 text-red-800 border border-red-200',
  MINOR:         'bg-orange-100 text-orange-800 border border-orange-200',
  FIRST_AID_ONLY:'bg-yellow-100 text-yellow-800 border border-yellow-200',
  NO_INJURY:     'bg-green-100 text-green-800 border border-green-200',
}

const STATUS_STYLE: Record<string, string> = {
  REPORTED:                   'bg-blue-100 text-blue-800',
  UNDER_INVESTIGATION:        'bg-amber-100 text-amber-800',
  CORRECTIVE_ACTIONS_ASSIGNED:'bg-purple-100 text-purple-800',
  CLOSED:                     'bg-green-100 text-green-800',
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  REPORTED:                   <Clock className="w-3.5 h-3.5" />,
  UNDER_INVESTIGATION:        <AlertTriangle className="w-3.5 h-3.5" />,
  CORRECTIVE_ACTIONS_ASSIGNED:<Zap className="w-3.5 h-3.5" />,
  CLOSED:                     <CheckCircle2 className="w-3.5 h-3.5" />,
}

const TYPE_LABEL: Record<string, string> = {
  ACCIDENT:             'Accident',
  NEAR_MISS:            'Near Miss',
  DANGEROUS_OCCURRENCE: 'Dangerous Occurrence',
  OCCUPATIONAL_DISEASE: 'Occupational Disease',
}

const SEVERITY_LABEL: Record<string, string> = {
  FATAL:          'Fatal',
  MAJOR:          'Major',
  MINOR:          'Minor',
  FIRST_AID_ONLY: 'First Aid Only',
  NO_INJURY:      'No Injury',
}

const STATUS_LABEL: Record<string, string> = {
  REPORTED:                   'Reported',
  UNDER_INVESTIGATION:        'Under Investigation',
  CORRECTIVE_ACTIONS_ASSIGNED:'Actions Assigned',
  CLOSED:                     'Closed',
}

// ─── Empty form ───────────────────────────────────────────────────────────────

interface IncidentForm {
  incidentType:   string
  severity:       string
  status:         string
  incidentDate:   string
  title:          string
  description:    string
  location:       string
  injuredPerson:  string
  witnesses:      string
  immediateAction: string
  rootCause:      string
  hazardId:       string
}

const EMPTY_FORM: IncidentForm = {
  incidentType:   'ACCIDENT',
  severity:       'MINOR',
  status:         'REPORTED',
  incidentDate:   '',
  title:          '',
  description:    '',
  location:       '',
  injuredPerson:  '',
  witnesses:      '',
  immediateAction:'',
  rootCause:      '',
  hazardId:       '',
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${TYPE_STYLE[type] ?? 'bg-gray-100 text-gray-700'}`}>
      {TYPE_LABEL[type] ?? type}
    </span>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_STYLE[severity] ?? 'bg-gray-100 text-gray-700'}`}>
      {SEVERITY_LABEL[severity] ?? severity}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {STATUS_ICON[status]}
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

interface DialogProps {
  title: string
  form: IncidentForm
  isEdit: boolean
  saving: boolean
  onChange: (f: IncidentForm) => void
  onSave: () => void
  onClose: () => void
}

function IncidentDialog({ title, form, isEdit, saving, onChange, onSave, onClose }: DialogProps) {
  const field = (key: keyof IncidentForm, label: string, type = 'text', required = false) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}{required && ' *'}</label>
      <Input
        type={type}
        value={form[key]}
        onChange={(e) => onChange({ ...form, [key]: e.target.value })}
        className="w-full text-sm"
      />
    </div>
  )

  const select = (key: keyof IncidentForm, label: string, options: { value: string; label: string }[]) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select
        className="w-full border rounded-md px-3 py-2 text-sm bg-white"
        value={form[key]}
        onChange={(e) => onChange({ ...form, [key]: e.target.value })}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('title', 'Title', 'text', true)}
          {field('incidentDate', 'Incident Date', 'date', true)}
          {select('incidentType', 'Incident Type', [
            { value: 'ACCIDENT', label: 'Accident' },
            { value: 'NEAR_MISS', label: 'Near Miss' },
            { value: 'DANGEROUS_OCCURRENCE', label: 'Dangerous Occurrence' },
            { value: 'OCCUPATIONAL_DISEASE', label: 'Occupational Disease' },
          ])}
          {select('severity', 'Severity', [
            { value: 'FATAL', label: 'Fatal' },
            { value: 'MAJOR', label: 'Major' },
            { value: 'MINOR', label: 'Minor' },
            { value: 'FIRST_AID_ONLY', label: 'First Aid Only' },
            { value: 'NO_INJURY', label: 'No Injury' },
          ])}
          {isEdit && select('status', 'Status', [
            { value: 'REPORTED', label: 'Reported' },
            { value: 'UNDER_INVESTIGATION', label: 'Under Investigation' },
            { value: 'CORRECTIVE_ACTIONS_ASSIGNED', label: 'Actions Assigned' },
            { value: 'CLOSED', label: 'Closed' },
          ])}
          {field('location', 'Location')}
          {field('injuredPerson', 'Injured Person')}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm bg-white resize-y"
              rows={2}
              value={form.description}
              onChange={(e) => onChange({ ...form, description: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Witnesses</label>
            <Input
              type="text"
              value={form.witnesses}
              onChange={(e) => onChange({ ...form, witnesses: e.target.value })}
              className="w-full text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Immediate Action Taken</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm bg-white resize-y"
              rows={2}
              value={form.immediateAction}
              onChange={(e) => onChange({ ...form, immediateAction: e.target.value })}
            />
          </div>
          {isEdit && (
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Root Cause</label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm bg-white resize-y"
                rows={2}
                value={form.rootCause}
                onChange={(e) => onChange({ ...form, rootCause: e.target.value })}
              />
            </div>
          )}
        </div>
        <div className="p-6 border-t flex justify-end gap-2 flex-wrap">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="button" onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Report Incident'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'ACCIDENT', label: 'Accidents' },
  { key: 'NEAR_MISS', label: 'Near Misses' },
  { key: 'DANGEROUS_OCCURRENCE', label: 'Dangerous Occurrences' },
  { key: 'OPEN', label: 'Open' },
  { key: 'CLOSED', label: 'Closed' },
]

const OPEN_STATUSES: IncidentStatus[] = ['REPORTED', 'UNDER_INVESTIGATION', 'CORRECTIVE_ACTIONS_ASSIGNED']

export function IncidentsTab({ siteId }: Props) {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState<Incident | null>(null)
  const [form, setForm] = useState<IncidentForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/sites/${siteId}/incidents`)
      const json = await res.json() as { ok: boolean; data: Incident[] }
      if (json.ok) setIncidents(json.data)
    } catch {
      toast.error('Failed to load incidents')
    } finally {
      setLoading(false)
    }
  }, [siteId])

  useEffect(() => { void load() }, [load])

  const filtered = incidents.filter((i) => {
    if (filter === 'ALL') return true
    if (filter === 'OPEN') return (OPEN_STATUSES as string[]).includes(i.status)
    if (filter === 'CLOSED') return i.status === 'CLOSED'
    return i.incidentType === filter
  })

  const stats = {
    total:      incidents.length,
    accidents:  incidents.filter((i) => i.incidentType === 'ACCIDENT').length,
    nearMisses: incidents.filter((i) => i.incidentType === 'NEAR_MISS').length,
    openInvestigations: incidents.filter((i) => i.status === 'UNDER_INVESTIGATION').length,
  }

  function openAdd() {
    setForm(EMPTY_FORM)
    setShowAdd(true)
  }

  function openEdit(inc: Incident) {
    setForm({
      incidentType:   inc.incidentType,
      severity:       inc.severity,
      status:         inc.status,
      incidentDate:   inc.incidentDate.slice(0, 10),
      title:          inc.title,
      description:    inc.description ?? '',
      location:       inc.location ?? '',
      injuredPerson:  inc.injuredPerson ?? '',
      witnesses:      inc.witnesses ?? '',
      immediateAction: inc.immediateAction ?? '',
      rootCause:      inc.rootCause ?? '',
      hazardId:       inc.hazardId ?? '',
    })
    setEditTarget(inc)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.incidentDate) {
      toast.error('Title and Incident Date are required')
      return
    }
    setSaving(true)
    try {
      const url = editTarget
        ? `/api/sites/${siteId}/incidents/${editTarget.id}`
        : `/api/sites/${siteId}/incidents`
      const method = editTarget ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          hazardId: form.hazardId || null,
          description: form.description || null,
          location: form.location || null,
          injuredPerson: form.injuredPerson || null,
          witnesses: form.witnesses || null,
          immediateAction: form.immediateAction || null,
          rootCause: form.rootCause || null,
        }),
      })
      const json = await res.json() as { ok: boolean; message?: string }
      if (json.ok) {
        toast.success(editTarget ? 'Incident updated' : 'Incident reported')
        setShowAdd(false)
        setEditTarget(null)
        void load()
      } else {
        toast.error(json.message ?? 'Failed to save')
      }
    } catch {
      toast.error('Failed to save incident')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(inc: Incident) {
    if (!confirm(`Delete incident "${inc.title}"?`)) return
    try {
      const res = await fetch(`/api/sites/${siteId}/incidents/${inc.id}`, { method: 'DELETE' })
      const json = await res.json() as { ok: boolean; message?: string }
      if (json.ok) {
        toast.success('Incident deleted')
        void load()
      } else {
        toast.error(json.message ?? 'Failed to delete')
      }
    } catch {
      toast.error('Failed to delete incident')
    }
  }

  async function handleGenerateActions(inc: Incident) {
    setGeneratingId(inc.id)
    try {
      const res = await fetch(`/api/sites/${siteId}/incidents/${inc.id}/generate-actions`, { method: 'POST' })
      const json = await res.json() as { ok: boolean; data?: { created: number }; message?: string }
      if (json.ok) {
        toast.success(`${json.data?.created ?? 1} corrective action(s) generated`)
        void load()
      } else {
        toast.error(json.message ?? 'Failed to generate actions')
      }
    } catch {
      toast.error('Failed to generate corrective actions')
    } finally {
      setGeneratingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Incidents" value={stats.total} color="blue" />
        <StatCard label="Accidents" value={stats.accidents} color="red" />
        <StatCard label="Near Misses" value={stats.nearMisses} color="orange" />
        <StatCard label="Under Investigation" value={stats.openInvestigations} color="amber" />
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button type="button" onClick={openAdd} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Report Incident
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <AlertOctagon className="w-10 h-10 mb-3" />
          <p className="text-sm">No incidents recorded yet.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Severity</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((inc) => (
                <IncidentRow
                  key={inc.id}
                  incident={inc}
                  generatingId={generatingId}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onGenerate={handleGenerateActions}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add dialog */}
      {showAdd && (
        <IncidentDialog
          title="Report New Incident"
          form={form}
          isEdit={false}
          saving={saving}
          onChange={setForm}
          onSave={handleSave}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Edit dialog */}
      {editTarget && (
        <IncidentDialog
          title="Edit Incident"
          form={form}
          isEdit
          saving={saving}
          onChange={setForm}
          onSave={handleSave}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue:   'bg-blue-50 border-blue-200 text-blue-700',
    red:    'bg-red-50 border-red-200 text-red-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    amber:  'bg-amber-50 border-amber-200 text-amber-700',
  }
  return (
    <div className={`rounded-lg border p-4 ${colors[color] ?? 'bg-gray-50 border-gray-200 text-gray-700'}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-80">{label}</p>
    </div>
  )
}

interface RowProps {
  incident: Incident
  generatingId: string | null
  onEdit: (i: Incident) => void
  onDelete: (i: Incident) => void
  onGenerate: (i: Incident) => void
}

function IncidentRow({ incident, generatingId, onEdit, onDelete, onGenerate }: RowProps) {
  const isGenerating = generatingId === incident.id
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
        {new Date(incident.incidentDate).toLocaleDateString()}
      </td>
      <td className="px-4 py-3"><TypeBadge type={incident.incidentType} /></td>
      <td className="px-4 py-3"><SeverityBadge severity={incident.severity} /></td>
      <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{incident.title}</td>
      <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate">{incident.location ?? '—'}</td>
      <td className="px-4 py-3"><StatusBadge status={incident.status} /></td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => onGenerate(incident)}
            disabled={isGenerating || incident.status === 'CLOSED'}
            title="Generate Corrective Actions"
            className="p-1.5 rounded hover:bg-orange-100 text-orange-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => onEdit(incident)}
            title="Edit"
            className="p-1.5 rounded hover:bg-blue-100 text-blue-600"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(incident)}
            title="Delete"
            className="p-1.5 rounded hover:bg-red-100 text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

