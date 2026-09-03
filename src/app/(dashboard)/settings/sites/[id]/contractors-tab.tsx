'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  Building2, Plus, Trash2, ChevronDown, ChevronRight,
  Users, ShieldCheck, CalendarClock, Pencil, X, Check,
  HardHat, ClipboardList,
} from 'lucide-react'
import { Button }  from '@/components/ui/button'
import { Input }   from '@/components/ui/input'
import { Label }   from '@/components/ui/label'
import { Badge }   from '@/components/ui/badge'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContractorWorker {
  id: string
  fullName: string
  role: string | null
  idNumber: string | null
  inductionDate: string | null
  inductionValid: boolean
  certifications: string | null
  notes: string | null
}

interface ContractorPermit {
  id: string
  permitType: string
  permitNumber: string | null
  issuedDate: string
  expiryDate: string
  workArea: string | null
  conditions: string | null
  status: string
}

interface Contractor {
  id: string
  companyName: string
  vatNumber: string | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  workScope: string | null
  startDate: string | null
  endDate: string | null
  isActive: boolean
  _count: { workers: number; permits: number }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PERMIT_TYPES = [
  'GENERAL', 'HOT_WORK', 'CONFINED_SPACE', 'ELECTRICAL', 'HEIGHT', 'EXCAVATION',
] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString()
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

function permitBadge(status: string, expiryDate: string) {
  const days = daysUntil(expiryDate)
  if (status === 'REVOKED') return <Badge variant="destructive">Revoked</Badge>
  if (status === 'EXPIRED' || days < 0) return <Badge variant="destructive">Expired</Badge>
  if (days <= 30) return <Badge className="bg-amber-100 text-amber-700">Exp. {days}d</Badge>
  return <Badge className="bg-green-100 text-green-700">Active</Badge>
}

// ─── Empty form factories ─────────────────────────────────────────────────────

function emptyContractor() {
  return {
    companyName: '', vatNumber: '', contactName: '',
    contactEmail: '', contactPhone: '', workScope: '',
    startDate: '', endDate: '', isActive: true,
  }
}

function emptyWorker() {
  return {
    fullName: '', role: '', idNumber: '',
    inductionDate: '', inductionValid: false,
    certifications: '', notes: '',
  }
}

function emptyPermit() {
  return {
    permitType: 'GENERAL' as string,
    permitNumber: '', issuedDate: '', expiryDate: '',
    workArea: '', conditions: '',
  }
}

// ─── Add/Edit Contractor Dialog ───────────────────────────────────────────────

interface ContractorDialogProps {
  siteId: string
  initial?: Contractor | null
  onClose: () => void
  onSaved: () => void
}

function ContractorDialog({ siteId, initial, onClose, onSaved }: ContractorDialogProps) {
  const t    = useTranslations('contractors')
  const [form, setForm] = useState(
    initial
      ? {
          companyName: initial.companyName,
          vatNumber: initial.vatNumber ?? '',
          contactName: initial.contactName ?? '',
          contactEmail: initial.contactEmail ?? '',
          contactPhone: initial.contactPhone ?? '',
          workScope: initial.workScope ?? '',
          startDate: initial.startDate ? initial.startDate.slice(0, 10) : '',
          endDate: initial.endDate ? initial.endDate.slice(0, 10) : '',
          isActive: initial.isActive,
        }
      : emptyContractor(),
  )
  const [saving, setSaving] = useState(false)

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function handleSave() {
    if (!form.companyName.trim()) { toast.error(t('validation.nameRequired')); return }
    setSaving(true)
    try {
      const url    = initial ? `/api/sites/${siteId}/contractors/${initial.id}` : `/api/sites/${siteId}/contractors`
      const method = initial ? 'PATCH' : 'POST'
      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const json = await res.json() as { ok: boolean; message?: string }
      if (!json.ok) { toast.error(json.message ?? t('saveError')); return }
      toast.success(initial ? t('updated') : t('created'))
      onSaved()
      onClose()
    } catch {
      toast.error(t('saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-lg">{initial ? t('editContractor') : t('addContractor')}</h2>
          <button type="button" onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <Label>{t('fields.companyName')} *</Label>
            <Input value={form.companyName} onChange={field('companyName')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('fields.vatNumber')}</Label>
              <Input value={form.vatNumber} onChange={field('vatNumber')} />
            </div>
            <div>
              <Label>{t('fields.contactName')}</Label>
              <Input value={form.contactName} onChange={field('contactName')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('fields.contactEmail')}</Label>
              <Input type="email" value={form.contactEmail} onChange={field('contactEmail')} />
            </div>
            <div>
              <Label>{t('fields.contactPhone')}</Label>
              <Input value={form.contactPhone} onChange={field('contactPhone')} />
            </div>
          </div>
          <div>
            <Label>{t('fields.workScope')}</Label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm resize-none h-20"
              value={form.workScope}
              onChange={field('workScope')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('fields.startDate')}</Label>
              <Input type="date" value={form.startDate} onChange={field('startDate')} />
            </div>
            <div>
              <Label>{t('fields.endDate')}</Label>
              <Input type="date" value={form.endDate} onChange={field('endDate')} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="h-4 w-4"
            />
            <Label htmlFor="isActive">{t('fields.isActive')}</Label>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t">
          <Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? t('saving') : t('save')}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Add Worker Dialog ────────────────────────────────────────────────────────

interface WorkerDialogProps {
  siteId: string
  contractorId: string
  initial?: ContractorWorker | null
  onClose: () => void
  onSaved: () => void
}

function WorkerDialog({ siteId, contractorId, initial, onClose, onSaved }: WorkerDialogProps) {
  const t = useTranslations('contractors')
  const [form, setForm] = useState(
    initial
      ? {
          fullName: initial.fullName,
          role: initial.role ?? '',
          idNumber: initial.idNumber ?? '',
          inductionDate: initial.inductionDate ? initial.inductionDate.slice(0, 10) : '',
          inductionValid: initial.inductionValid,
          certifications: initial.certifications ?? '',
          notes: initial.notes ?? '',
        }
      : emptyWorker(),
  )
  const [saving, setSaving] = useState(false)

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function handleSave() {
    if (!form.fullName.trim()) { toast.error(t('validation.nameRequired')); return }
    setSaving(true)
    try {
      const url    = initial
        ? `/api/sites/${siteId}/contractors/${contractorId}/workers/${initial.id}`
        : `/api/sites/${siteId}/contractors/${contractorId}/workers`
      const method = initial ? 'PATCH' : 'POST'
      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const json = await res.json() as { ok: boolean; message?: string }
      if (!json.ok) { toast.error(json.message ?? t('saveError')); return }
      toast.success(initial ? t('workerUpdated') : t('workerAdded'))
      onSaved()
      onClose()
    } catch {
      toast.error(t('saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-lg">{initial ? t('editWorker') : t('addWorker')}</h2>
          <button type="button" onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <Label>{t('fields.fullName')} *</Label>
            <Input value={form.fullName} onChange={field('fullName')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('fields.role')}</Label>
              <Input value={form.role} onChange={field('role')} />
            </div>
            <div>
              <Label>{t('fields.idNumber')}</Label>
              <Input value={form.idNumber} onChange={field('idNumber')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('fields.inductionDate')}</Label>
              <Input type="date" value={form.inductionDate} onChange={field('inductionDate')} />
            </div>
            <div className="flex items-end gap-2 pb-0.5">
              <input
                type="checkbox"
                id="inductionValid"
                checked={form.inductionValid}
                onChange={(e) => setForm((f) => ({ ...f, inductionValid: e.target.checked }))}
                className="h-4 w-4"
              />
              <Label htmlFor="inductionValid">{t('fields.inductionValid')}</Label>
            </div>
          </div>
          <div>
            <Label>{t('fields.certifications')}</Label>
            <Input value={form.certifications} onChange={field('certifications')} placeholder={t('fields.certificationsPlaceholder')} />
          </div>
          <div>
            <Label>{t('fields.notes')}</Label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm resize-none h-20"
              value={form.notes}
              onChange={field('notes')}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t">
          <Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? t('saving') : t('save')}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Add Permit Dialog ────────────────────────────────────────────────────────

interface PermitDialogProps {
  siteId: string
  contractorId: string
  initial?: ContractorPermit | null
  onClose: () => void
  onSaved: () => void
}

function PermitDialog({ siteId, contractorId, initial, onClose, onSaved }: PermitDialogProps) {
  const t = useTranslations('contractors')
  const [form, setForm] = useState(
    initial
      ? {
          permitType: initial.permitType,
          permitNumber: initial.permitNumber ?? '',
          issuedDate: initial.issuedDate ? initial.issuedDate.slice(0, 10) : '',
          expiryDate: initial.expiryDate ? initial.expiryDate.slice(0, 10) : '',
          workArea: initial.workArea ?? '',
          conditions: initial.conditions ?? '',
        }
      : emptyPermit(),
  )
  const [saving, setSaving] = useState(false)

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function handleSave() {
    if (!form.issuedDate || !form.expiryDate) { toast.error(t('validation.datesRequired')); return }
    setSaving(true)
    try {
      const url    = initial
        ? `/api/sites/${siteId}/contractors/${contractorId}/permits/${initial.id}`
        : `/api/sites/${siteId}/contractors/${contractorId}/permits`
      const method = initial ? 'PATCH' : 'POST'
      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const json = await res.json() as { ok: boolean; message?: string }
      if (!json.ok) { toast.error(json.message ?? t('saveError')); return }
      toast.success(initial ? t('permitUpdated') : t('permitCreated'))
      onSaved()
      onClose()
    } catch {
      toast.error(t('saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-lg">{initial ? t('editPermit') : t('addPermit')}</h2>
          <button type="button" onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <Label>{t('fields.permitType')}</Label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={form.permitType}
              onChange={field('permitType')}
            >
              {PERMIT_TYPES.map((pt) => (
                <option key={pt} value={pt}>{t(`permitTypes.${pt}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>{t('fields.permitNumber')}</Label>
            <Input value={form.permitNumber} onChange={field('permitNumber')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('fields.issuedDate')} *</Label>
              <Input type="date" value={form.issuedDate} onChange={field('issuedDate')} />
            </div>
            <div>
              <Label>{t('fields.expiryDate')} *</Label>
              <Input type="date" value={form.expiryDate} onChange={field('expiryDate')} />
            </div>
          </div>
          <div>
            <Label>{t('fields.workArea')}</Label>
            <Input value={form.workArea} onChange={field('workArea')} />
          </div>
          <div>
            <Label>{t('fields.conditions')}</Label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm resize-none h-20"
              value={form.conditions}
              onChange={field('conditions')}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t">
          <Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? t('saving') : t('save')}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Contractor Card (expanded) ───────────────────────────────────────────────

interface ContractorCardProps {
  siteId: string
  contractor: Contractor
  onChanged: () => void
}

function ContractorCard({ siteId, contractor, onChanged }: ContractorCardProps) {
  const t = useTranslations('contractors')

  const [expanded, setExpanded]         = useState(false)
  const [workers, setWorkers]           = useState<ContractorWorker[]>([])
  const [permits, setPermits]           = useState<ContractorPermit[]>([])
  const [loadingInner, setLoadingInner] = useState(false)

  const [showEditC, setShowEditC]   = useState(false)
  const [showAddW, setShowAddW]     = useState(false)
  const [editWorker, setEditWorker] = useState<ContractorWorker | null>(null)
  const [showAddP, setShowAddP]     = useState(false)
  const [editPermit, setEditPermit] = useState<ContractorPermit | null>(null)

  const loadInner = useCallback(async () => {
    setLoadingInner(true)
    try {
      const [wRes, pRes] = await Promise.all([
        fetch(`/api/sites/${siteId}/contractors/${contractor.id}/workers`),
        fetch(`/api/sites/${siteId}/contractors/${contractor.id}/permits`),
      ])
      const [wJson, pJson] = await Promise.all([
        wRes.json() as Promise<{ ok: boolean; data: ContractorWorker[] }>,
        pRes.json() as Promise<{ ok: boolean; data: ContractorPermit[] }>,
      ])
      if (wJson.ok) setWorkers(wJson.data)
      if (pJson.ok) setPermits(pJson.data)
    } finally {
      setLoadingInner(false)
    }
  }, [siteId, contractor.id])

  function toggle() {
    if (!expanded) void loadInner()
    setExpanded((v) => !v)
  }

  async function deleteContractor() {
    if (!confirm(t('confirmDelete'))) return
    await fetch(`/api/sites/${siteId}/contractors/${contractor.id}`, { method: 'DELETE' })
    toast.success(t('deleted'))
    onChanged()
  }

  async function deleteWorker(workerId: string) {
    if (!confirm(t('confirmDeleteWorker'))) return
    await fetch(`/api/sites/${siteId}/contractors/${contractor.id}/workers/${workerId}`, { method: 'DELETE' })
    toast.success(t('workerRemoved'))
    void loadInner()
  }

  async function deletePermit(permitId: string) {
    if (!confirm(t('confirmDeletePermit'))) return
    await fetch(`/api/sites/${siteId}/contractors/${contractor.id}/permits/${permitId}`, { method: 'DELETE' })
    toast.success(t('permitDeleted'))
    void loadInner()
  }

  const expiringPermits = permits.filter((p) => {
    if (p.status === 'REVOKED') return false
    const days = daysUntil(p.expiryDate)
    return days >= 0 && days <= 30
  }).length

  return (
    <div className="border rounded-xl overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 p-4 bg-white hover:bg-gray-50">
        <button type="button" onClick={toggle} className="flex-1 flex items-center gap-3 text-left">
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <Building2 className="w-5 h-5 text-blue-600" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{contractor.companyName}</span>
              {contractor.isActive
                ? <Badge className="bg-green-100 text-green-700">{t('active')}</Badge>
                : <Badge variant="secondary">{t('inactive')}</Badge>
              }
              {expiringPermits > 0 && (
                <Badge className="bg-amber-100 text-amber-700">
                  {expiringPermits} {t('permitsExpiring')}
                </Badge>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-0.5 truncate">
              {contractor.workScope ?? t('noScope')}
              {contractor.startDate && ` · ${fmtDate(contractor.startDate)} — ${fmtDate(contractor.endDate)}`}
            </div>
          </div>
          <div className="flex gap-4 text-xs text-gray-500 mr-2">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />{contractor._count.workers}
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />{contractor._count.permits}
            </span>
          </div>
        </button>
        <div className="flex gap-1 shrink-0">
          <button type="button" onClick={() => setShowEditC(true)} className="p-1.5 rounded hover:bg-gray-100">
            <Pencil className="w-4 h-4 text-gray-400" />
          </button>
          <button type="button" onClick={deleteContractor} className="p-1.5 rounded hover:bg-red-50">
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t bg-gray-50 p-4 space-y-5">
          {loadingInner && <p className="text-sm text-gray-400">{t('loading')}</p>}

          {/* Workers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <HardHat className="w-4 h-4 text-orange-500" />
                {t('workersTitle')}
              </h4>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowAddW(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" />{t('addWorker')}
              </Button>
            </div>
            {workers.length === 0
              ? <p className="text-xs text-gray-400 italic">{t('noWorkers')}</p>
              : (
                <div className="rounded-lg overflow-hidden border">
                  <table className="w-full text-xs">
                    <thead className="bg-white border-b">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">{t('fields.fullName')}</th>
                        <th className="text-left px-3 py-2 font-medium">{t('fields.role')}</th>
                        <th className="text-left px-3 py-2 font-medium">{t('fields.inductionDate')}</th>
                        <th className="text-left px-3 py-2 font-medium">{t('fields.inductionValid')}</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {workers.map((w) => (
                        <tr key={w.id} className="border-t bg-white hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{w.fullName}</td>
                          <td className="px-3 py-2 text-gray-500">{w.role ?? '—'}</td>
                          <td className="px-3 py-2 text-gray-500">{fmtDate(w.inductionDate)}</td>
                          <td className="px-3 py-2">
                            {w.inductionValid
                              ? <Check className="w-4 h-4 text-green-500" />
                              : <X className="w-4 h-4 text-gray-300" />
                            }
                          </td>
                          <td className="px-3 py-2 flex gap-1 justify-end">
                            <button type="button" onClick={() => setEditWorker(w)} className="p-1 rounded hover:bg-gray-100">
                              <Pencil className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                            <button type="button" onClick={() => void deleteWorker(w.id)} className="p-1 rounded hover:bg-red-50">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>

          {/* Permits */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-blue-500" />
                {t('permitsTitle')}
              </h4>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowAddP(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" />{t('addPermit')}
              </Button>
            </div>
            {permits.length === 0
              ? <p className="text-xs text-gray-400 italic">{t('noPermits')}</p>
              : (
                <div className="rounded-lg overflow-hidden border">
                  <table className="w-full text-xs">
                    <thead className="bg-white border-b">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">{t('fields.permitType')}</th>
                        <th className="text-left px-3 py-2 font-medium">{t('fields.permitNumber')}</th>
                        <th className="text-left px-3 py-2 font-medium">{t('fields.issuedDate')}</th>
                        <th className="text-left px-3 py-2 font-medium">{t('fields.expiryDate')}</th>
                        <th className="text-left px-3 py-2 font-medium">{t('fields.workArea')}</th>
                        <th className="text-left px-3 py-2 font-medium">{t('status')}</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {permits.map((p) => (
                        <tr key={p.id} className="border-t bg-white hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{t(`permitTypes.${p.permitType}`)}</td>
                          <td className="px-3 py-2 text-gray-500">{p.permitNumber ?? '—'}</td>
                          <td className="px-3 py-2 text-gray-500">{fmtDate(p.issuedDate)}</td>
                          <td className="px-3 py-2 text-gray-500">{fmtDate(p.expiryDate)}</td>
                          <td className="px-3 py-2 text-gray-500">{p.workArea ?? '—'}</td>
                          <td className="px-3 py-2">{permitBadge(p.status, p.expiryDate)}</td>
                          <td className="px-3 py-2 flex gap-1 justify-end">
                            <button type="button" onClick={() => setEditPermit(p)} className="p-1 rounded hover:bg-gray-100">
                              <Pencil className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                            <button type="button" onClick={() => void deletePermit(p.id)} className="p-1 rounded hover:bg-red-50">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        </div>
      )}

      {/* Dialogs */}
      {showEditC && (
        <ContractorDialog
          siteId={siteId}
          initial={contractor}
          onClose={() => setShowEditC(false)}
          onSaved={onChanged}
        />
      )}
      {showAddW && (
        <WorkerDialog
          siteId={siteId}
          contractorId={contractor.id}
          onClose={() => setShowAddW(false)}
          onSaved={() => void loadInner()}
        />
      )}
      {editWorker && (
        <WorkerDialog
          siteId={siteId}
          contractorId={contractor.id}
          initial={editWorker}
          onClose={() => setEditWorker(null)}
          onSaved={() => void loadInner()}
        />
      )}
      {showAddP && (
        <PermitDialog
          siteId={siteId}
          contractorId={contractor.id}
          onClose={() => setShowAddP(false)}
          onSaved={() => void loadInner()}
        />
      )}
      {editPermit && (
        <PermitDialog
          siteId={siteId}
          contractorId={contractor.id}
          initial={editPermit}
          onClose={() => setEditPermit(null)}
          onSaved={() => void loadInner()}
        />
      )}
    </div>
  )
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

interface ContractorsTabProps {
  siteId: string
}

export function ContractorsTab({ siteId }: ContractorsTabProps) {
  const t = useTranslations('contractors')

  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading]         = useState(true)
  const [showAdd, setShowAdd]         = useState(false)

  const loadContractors = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/sites/${siteId}/contractors`)
      const json = await res.json() as { ok: boolean; data: Contractor[] }
      if (json.ok) setContractors(json.data)
    } finally {
      setLoading(false)
    }
  }, [siteId])

  useEffect(() => { void loadContractors() }, [loadContractors])

  const active      = contractors.filter((c) => c.isActive).length
  const totalWorkers = contractors.reduce((s, c) => s + c._count.workers, 0)
  const expiringPermits = contractors.reduce((s, c) => {
    // We don't have individual permit data at the list level; show total permits count instead
    return s + c._count.permits
  }, 0)

  const today = new Date()
  const in30  = new Date(today); in30.setDate(today.getDate() + 30)

  const stats = [
    { label: t('stats.total'),   value: contractors.length, icon: <Building2 className="w-5 h-5 text-blue-500" /> },
    { label: t('stats.active'),  value: active,             icon: <Check className="w-5 h-5 text-green-500" /> },
    { label: t('stats.workers'), value: totalWorkers,       icon: <Users className="w-5 h-5 text-orange-500" /> },
    { label: t('stats.permits'), value: expiringPermits,    icon: <CalendarClock className="w-5 h-5 text-amber-500" /> },
  ]

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border rounded-xl p-4 flex items-center gap-3">
            {s.icon}
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* List header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700">{t('listTitle')}</h3>
        <Button type="button" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1" />{t('addContractor')}
        </Button>
      </div>

      {/* List */}
      {loading
        ? <p className="text-sm text-gray-400">{t('loading')}</p>
        : contractors.length === 0
          ? (
            <div className="text-center py-12 text-gray-400 border rounded-xl">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t('noContractors')}</p>
            </div>
          )
          : (
            <div className="space-y-3">
              {contractors.map((c) => (
                <ContractorCard
                  key={c.id}
                  siteId={siteId}
                  contractor={c}
                  onChanged={() => void loadContractors()}
                />
              ))}
            </div>
          )
      }

      {showAdd && (
        <ContractorDialog
          siteId={siteId}
          onClose={() => setShowAdd(false)}
          onSaved={() => void loadContractors()}
        />
      )}
    </div>
  )
}
