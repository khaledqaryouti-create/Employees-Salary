'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Plus, Wand2, Trash2, Pencil, AlertTriangle, CheckCircle2,
  Clock, XCircle, AlertOctagon, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CorrectiveAction } from './types'

interface Props { siteId: string }

// ─── Constants ────────────────────────────────────────────────────────────────

type StatusFilter = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED'

const PRIORITY_STYLE: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border border-red-200',
  HIGH:     'bg-orange-100 text-orange-800 border border-orange-200',
  MEDIUM:   'bg-yellow-100 text-yellow-800 border border-yellow-200',
  LOW:      'bg-green-100 text-green-800 border border-green-200',
}

const STATUS_STYLE: Record<string, string> = {
  OPEN:        'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  COMPLETED:   'bg-green-100 text-green-800',
  OVERDUE:     'bg-red-100 text-red-800',
  CANCELLED:   'bg-gray-100 text-gray-600',
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  OPEN:        <Clock className="w-3.5 h-3.5" />,
  IN_PROGRESS: <AlertTriangle className="w-3.5 h-3.5" />,
  COMPLETED:   <CheckCircle2 className="w-3.5 h-3.5" />,
  OVERDUE:     <AlertOctagon className="w-3.5 h-3.5" />,
  CANCELLED:   <XCircle className="w-3.5 h-3.5" />,
}

// ─── Empty form ───────────────────────────────────────────────────────────────

interface ActionForm {
  title:           string
  description:     string
  priority:        string
  status:          string
  assignedToId:    string
  dueDate:         string
  verificationNote: string
  hazardId:        string
}

function emptyForm(): ActionForm {
  return {
    title: '', description: '', priority: 'HIGH', status: 'OPEN',
    assignedToId: '', dueDate: '', verificationNote: '', hazardId: '',
  }
}

function formFromAction(a: CorrectiveAction): ActionForm {
  return {
    title:            a.title,
    description:      a.description ?? '',
    priority:         a.priority,
    status:           a.status,
    assignedToId:     a.assignedToId ?? '',
    dueDate:          a.dueDate ? a.dueDate.slice(0, 10) : '',
    verificationNote: a.verificationNote ?? '',
    hazardId:         a.hazardId ?? '',
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

// ─── Action dialog ────────────────────────────────────────────────────────────

interface DialogProps {
  siteId:    string
  action?:   CorrectiveAction
  employees: { id: string; fullName: string }[]
  onClose:   () => void
  onSaved:   () => void
}

function ActionDialog({ siteId, action, employees, onClose, onSaved }: DialogProps) {
  const [form, setForm]     = useState<ActionForm>(action ? formFromAction(action) : emptyForm())
  const [saving, setSaving] = useState(false)

  const isEdit = Boolean(action)

  async function handleSave() {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const url    = isEdit
        ? `/api/sites/${siteId}/corrective-actions/${action!.id}`
        : `/api/sites/${siteId}/corrective-actions`
      const method = isEdit ? 'PATCH' : 'POST'

      const body: Record<string, unknown> = {
        title:            form.title,
        description:      form.description || null,
        priority:         form.priority,
        assignedToId:     form.assignedToId || null,
        dueDate:          form.dueDate || null,
        verificationNote: form.verificationNote || null,
        hazardId:         form.hazardId || null,
      }
      if (isEdit) body['status'] = form.status

      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json() as { ok: boolean; message?: string }
      if (!json.ok) { toast.error(json.message ?? 'Failed to save action'); return }
      toast.success(isEdit ? 'Action updated' : 'Action created')
      onSaved()
      onClose()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  function set(field: keyof ActionForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{isEdit ? 'Edit Action' : 'Add Corrective Action'}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Install safety guard on grinder" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              placeholder="Detailed steps or acceptance criteria..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => set('priority', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            {isEdit && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Assigned To</label>
              <select
                value={form.assignedToId}
                onChange={(e) => set('assignedToId', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">— Unassigned —</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
              <Input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
            </div>
          </div>

          {isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Verification Note</label>
              <textarea
                value={form.verificationNote}
                onChange={(e) => set('verificationNote', e.target.value)}
                rows={2}
                placeholder="Evidence of completion..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {isEdit ? 'Save Changes' : 'Create Action'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CorrectiveActionsTab({ siteId }: Props) {
  const [actions,    setActions]    = useState<CorrectiveAction[]>([])
  const [employees,  setEmployees]  = useState<{ id: string; fullName: string }[]>([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState<StatusFilter>('ALL')
  const [generating, setGenerating] = useState(false)
  const [showAdd,    setShowAdd]    = useState(false)
  const [editAction, setEditAction] = useState<CorrectiveAction | null>(null)
  const [deleting,   setDeleting]   = useState<string | null>(null)

  const loadActions = useCallback(async () => {
    try {
      const res  = await fetch(`/api/sites/${siteId}/corrective-actions`)
      const json = await res.json() as { ok: boolean; data: CorrectiveAction[] }
      if (json.ok) setActions(json.data)
    } catch {
      toast.error('Failed to load corrective actions')
    } finally {
      setLoading(false)
    }
  }, [siteId])

  useEffect(() => {
    void loadActions()
    fetch(`/api/employees?limit=200`)
      .then((r) => r.json() as Promise<{ ok: boolean; data: { data: { id: string; fullName: string }[] } }>)
      .then((j) => { if (j.ok) setEmployees(j.data.data ?? []) })
      .catch(() => null)
  }, [loadActions])

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res  = await fetch(`/api/sites/${siteId}/corrective-actions/generate`, { method: 'POST' })
      const json = await res.json() as { ok: boolean; data?: { created: number; message?: string }; message?: string }
      if (json.ok) {
        const count = json.data?.created ?? 0
        if (count === 0) {
          toast.info(json.data?.message ?? 'All HIGH-risk hazards already have actions')
        } else {
          toast.success(`${count} corrective action(s) created from HIGH risks`)
        }
        void loadActions()
      } else {
        toast.error(json.message ?? 'Failed to generate actions')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setGenerating(false)
    }
  }

  async function handleDelete(actionId: string) {
    if (!confirm('Delete this corrective action?')) return
    setDeleting(actionId)
    try {
      const res  = await fetch(`/api/sites/${siteId}/corrective-actions/${actionId}`, { method: 'DELETE' })
      const json = await res.json() as { ok: boolean; message?: string }
      if (json.ok) { toast.success('Action deleted'); void loadActions() }
      else toast.error(json.message ?? 'Failed to delete')
    } catch {
      toast.error('Network error')
    } finally {
      setDeleting(null)
    }
  }

  const filtered = filter === 'ALL' ? actions : actions.filter((a) => a.status === filter)

  const stats = {
    open:       actions.filter((a) => a.status === 'OPEN').length,
    inProgress: actions.filter((a) => a.status === 'IN_PROGRESS').length,
    overdue:    actions.filter((a) => a.status === 'OVERDUE').length,
    completed:  actions.filter((a) => a.status === 'COMPLETED').length,
  }

  const FILTER_OPTIONS: { id: StatusFilter; label: string }[] = [
    { id: 'ALL',         label: `All (${actions.length})` },
    { id: 'OPEN',        label: `Open (${stats.open})` },
    { id: 'IN_PROGRESS', label: `In Progress (${stats.inProgress})` },
    { id: 'OVERDUE',     label: `Overdue (${stats.overdue})` },
    { id: 'COMPLETED',   label: `Completed (${stats.completed})` },
    { id: 'CANCELLED',   label: 'Cancelled' },
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
          <h2 className="font-semibold text-gray-900">Corrective Action Plan</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Track prevention and protection measures required by D.Lgs. 81/2008 Art. 28(2)(d)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            Generate from HIGH risks
          </Button>
          <Button type="button" size="sm" onClick={() => setShowAdd(true)} className="flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add Action
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-3">
        <StatCard label="Open"        count={stats.open}       color="border-blue-200 bg-blue-50 text-blue-700" />
        <StatCard label="In Progress" count={stats.inProgress} color="border-amber-200 bg-amber-50 text-amber-700" />
        <StatCard label="Overdue"     count={stats.overdue}    color="border-red-200 bg-red-50 text-red-700" />
        <StatCard label="Completed"   count={stats.completed}  color="border-green-200 bg-green-50 text-green-700" />
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
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No actions found.</p>
          {actions.length === 0 && (
            <p className="text-xs mt-1">
              Click &ldquo;Generate from HIGH risks&rdquo; to auto-create actions from the risk assessment.
            </p>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Title</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-28">Priority</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-28">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Assigned To</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-28">Due Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((action) => (
                <tr key={action.id} className={action.status === 'OVERDUE' ? 'bg-red-50' : 'bg-white hover:bg-gray-50'}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{action.title}</p>
                    {action.hazard && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {action.hazard.hazardCode} — {action.hazard.task.name}
                      </p>
                    )}
                    {action.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{action.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_STYLE[action.priority] ?? ''}`}>
                      {action.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[action.status] ?? ''}`}>
                      {STATUS_ICON[action.status]}
                      {action.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {action.assignedTo ? action.assignedTo.fullName : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {action.dueDate ? (
                      <span className={new Date(action.dueDate) < new Date() && action.status !== 'COMPLETED' ? 'text-red-600 font-medium' : ''}>
                        {action.dueDate.slice(0, 10)}
                      </span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditAction(action)}
                        className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(action.id)}
                        disabled={deleting === action.id}
                        className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete"
                      >
                        {deleting === action.id
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

      {/* Add dialog */}
      {showAdd && (
        <ActionDialog
          siteId={siteId}
          employees={employees}
          onClose={() => setShowAdd(false)}
          onSaved={loadActions}
        />
      )}

      {/* Edit dialog */}
      {editAction && (
        <ActionDialog
          siteId={siteId}
          action={editAction}
          employees={employees}
          onClose={() => setEditAction(null)}
          onSaved={loadActions}
        />
      )}
    </div>
  )
}
