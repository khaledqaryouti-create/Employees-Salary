'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, Loader2, GraduationCap,
  CheckCircle2, AlertTriangle, XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { TrainingRecord, WorkerGroup } from './types'

interface Props {
  siteId:       string
  workerGroups: WorkerGroup[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

type StatusFilter = 'ALL' | 'VALID' | 'EXPIRING_SOON' | 'EXPIRED'

const STATUS_STYLE: Record<string, string> = {
  VALID:          'bg-green-100 text-green-800',
  EXPIRING_SOON:  'bg-amber-100 text-amber-800',
  EXPIRED:        'bg-red-100 text-red-800',
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  VALID:         <CheckCircle2 className="w-3.5 h-3.5" />,
  EXPIRING_SOON: <AlertTriangle className="w-3.5 h-3.5" />,
  EXPIRED:       <XCircle className="w-3.5 h-3.5" />,
}

const STATUS_LABEL: Record<string, string> = {
  VALID:         'Valid',
  EXPIRING_SOON: 'Expiring Soon',
  EXPIRED:       'Expired',
}

// ─── Form type ────────────────────────────────────────────────────────────────

interface RecordForm {
  trainingType:   string
  description:    string
  trainerName:    string
  trainingDate:   string
  expiryDate:     string
  certificateRef: string
  workerGroupId:  string
  employeeId:     string
}

function emptyForm(): RecordForm {
  return {
    trainingType: '', description: '', trainerName: '',
    trainingDate: '', expiryDate: '', certificateRef: '',
    workerGroupId: '', employeeId: '',
  }
}

function formFromRecord(r: TrainingRecord): RecordForm {
  return {
    trainingType:   r.trainingType,
    description:    r.description ?? '',
    trainerName:    r.trainerName ?? '',
    trainingDate:   r.trainingDate ? r.trainingDate.slice(0, 10) : '',
    expiryDate:     r.expiryDate   ? r.expiryDate.slice(0, 10)   : '',
    certificateRef: r.certificateRef ?? '',
    workerGroupId:  r.workerGroupId ?? '',
    employeeId:     r.employeeId ?? '',
  }
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`flex-1 rounded-lg border p-4 text-center ${color}`}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs mt-1 uppercase tracking-wide">{label}</p>
    </div>
  )
}

// ─── Record dialog ────────────────────────────────────────────────────────────

interface DialogProps {
  siteId:       string
  record?:      TrainingRecord
  workerGroups: WorkerGroup[]
  onClose:      () => void
  onSaved:      () => void
}

function RecordDialog({ siteId, record, workerGroups, onClose, onSaved }: DialogProps) {
  const [form, setForm]     = useState<RecordForm>(record ? formFromRecord(record) : emptyForm())
  const [saving, setSaving] = useState(false)
  const isEdit              = Boolean(record)

  async function handleSave() {
    if (!form.trainingType.trim()) { toast.error('Training type is required'); return }
    if (!form.trainingDate)        { toast.error('Training date is required'); return }
    setSaving(true)
    try {
      const url    = isEdit
        ? `/api/sites/${siteId}/training-records/${record!.id}`
        : `/api/sites/${siteId}/training-records`
      const method = isEdit ? 'PATCH' : 'POST'

      const body: Record<string, unknown> = {
        trainingType:   form.trainingType,
        description:    form.description   || null,
        trainerName:    form.trainerName   || null,
        trainingDate:   form.trainingDate,
        expiryDate:     form.expiryDate    || null,
        certificateRef: form.certificateRef || null,
        workerGroupId:  form.workerGroupId || null,
        employeeId:     form.employeeId    || null,
      }

      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json() as { ok: boolean; message?: string }
      if (!json.ok) { toast.error(json.message ?? 'Failed to save record'); return }
      toast.success(isEdit ? 'Record updated' : 'Record created')
      onSaved()
      onClose()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  function set(field: keyof RecordForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{isEdit ? 'Edit Training Record' : 'Add Training Record'}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Training Type *</label>
            <Input value={form.trainingType} onChange={(e) => set('trainingType', e.target.value)} placeholder="e.g. Fire Safety, Manual Handling, Working at Height" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              placeholder="Course content or regulatory reference..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Worker Group</label>
              <select
                value={form.workerGroupId}
                onChange={(e) => set('workerGroupId', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">— All / Not Specific —</option>
                {workerGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.code} — {g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Trainer Name</label>
              <Input value={form.trainerName} onChange={(e) => set('trainerName', e.target.value)} placeholder="e.g. Safety Officer" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Training Date *</label>
              <Input type="date" value={form.trainingDate} onChange={(e) => set('trainingDate', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Expiry Date</label>
              <Input type="date" value={form.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Certificate / Reference No.</label>
            <Input value={form.certificateRef} onChange={(e) => set('certificateRef', e.target.value)} placeholder="e.g. CERT-2026-001 or URL" />
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {isEdit ? 'Save Changes' : 'Create Record'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TrainingTab({ siteId, workerGroups }: Props) {
  const [records,    setRecords]    = useState<TrainingRecord[]>([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState<StatusFilter>('ALL')
  const [showAdd,    setShowAdd]    = useState(false)
  const [editRecord, setEditRecord] = useState<TrainingRecord | null>(null)
  const [deleting,   setDeleting]   = useState<string | null>(null)

  const loadRecords = useCallback(async () => {
    try {
      const res  = await fetch(`/api/sites/${siteId}/training-records`)
      const json = await res.json() as { ok: boolean; data: TrainingRecord[] }
      if (json.ok) setRecords(json.data)
    } catch {
      toast.error('Failed to load training records')
    } finally {
      setLoading(false)
    }
  }, [siteId])

  useEffect(() => { void loadRecords() }, [loadRecords])

  async function handleDelete(recordId: string) {
    if (!confirm('Delete this training record?')) return
    setDeleting(recordId)
    try {
      const res  = await fetch(`/api/sites/${siteId}/training-records/${recordId}`, { method: 'DELETE' })
      const json = await res.json() as { ok: boolean; message?: string }
      if (json.ok) { toast.success('Record deleted'); void loadRecords() }
      else toast.error(json.message ?? 'Failed to delete')
    } catch {
      toast.error('Network error')
    } finally {
      setDeleting(null)
    }
  }

  const filtered = filter === 'ALL' ? records : records.filter((r) => r.status === filter)

  const stats = {
    valid:         records.filter((r) => r.status === 'VALID').length,
    expiringSoon:  records.filter((r) => r.status === 'EXPIRING_SOON').length,
    expired:       records.filter((r) => r.status === 'EXPIRED').length,
  }

  const FILTER_OPTIONS: { id: StatusFilter; label: string }[] = [
    { id: 'ALL',          label: `All (${records.length})` },
    { id: 'VALID',        label: `Valid (${stats.valid})` },
    { id: 'EXPIRING_SOON', label: `Expiring Soon (${stats.expiringSoon})` },
    { id: 'EXPIRED',      label: `Expired (${stats.expired})` },
  ]

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Training &amp; Competency Records</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Safety training documentation required by D.Lgs. 81/2008 Art. 37
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setShowAdd(true)} className="flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Add Training Record
        </Button>
      </div>

      {/* Stats bar */}
      <div className="flex gap-3">
        <StatCard label="Valid"         count={stats.valid}        color="border-green-200 bg-green-50 text-green-700" />
        <StatCard label="Expiring Soon" count={stats.expiringSoon} color="border-amber-200 bg-amber-50 text-amber-700" />
        <StatCard label="Expired"       count={stats.expired}      color="border-red-200 bg-red-50 text-red-700" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setFilter(opt.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              filter === opt.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No training records found.</p>
          {records.length === 0 && (
            <p className="text-xs mt-1">
              Click &ldquo;Add Training Record&rdquo; to document safety training for your worker groups.
            </p>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Training Type</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Worker Group</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Trainer</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-24">Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-24">Expiry</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Certificate</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-28">Status</th>
                <th className="px-4 py-2.5 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((record) => (
                <tr key={record.id} className={record.status === 'EXPIRED' ? 'bg-red-50' : 'bg-white hover:bg-gray-50'}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{record.trainingType}</p>
                    {record.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{record.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {record.workerGroup
                      ? <span>{record.workerGroup.code} — {record.workerGroup.name}</span>
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {record.trainerName ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-700 text-xs">
                    {record.trainingDate.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {record.expiryDate
                      ? <span className={record.status === 'EXPIRED' ? 'text-red-600 font-medium' : record.status === 'EXPIRING_SOON' ? 'text-amber-600 font-medium' : 'text-gray-700'}>
                          {record.expiryDate.slice(0, 10)}
                        </span>
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {record.certificateRef ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[record.status] ?? ''}`}>
                      {STATUS_ICON[record.status]}
                      {STATUS_LABEL[record.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditRecord(record)}
                        className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(record.id)}
                        disabled={deleting === record.id}
                        className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete"
                      >
                        {deleting === record.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <RecordDialog siteId={siteId} workerGroups={workerGroups} onClose={() => setShowAdd(false)} onSaved={loadRecords} />
      )}
      {editRecord && (
        <RecordDialog siteId={siteId} record={editRecord} workerGroups={workerGroups} onClose={() => setEditRecord(null)} onSaved={loadRecords} />
      )}
    </div>
  )
}
