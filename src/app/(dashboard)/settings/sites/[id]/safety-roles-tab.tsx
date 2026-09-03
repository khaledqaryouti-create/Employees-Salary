'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Loader2, Trash2, Pencil, AlertTriangle, ShieldCheck } from 'lucide-react'
import type { SafetyRole, EmployeeRef } from './types'

const ROLE_TYPES = [
  'EMPLOYER', 'RSPP', 'ASPP', 'RLS', 'RLST', 'MEDICO_COMPETENTE',
  'MANAGER', 'SUPERVISOR', 'FIRST_AID', 'FIRE_EMERGENCY',
] as const

function isExpired(role: SafetyRole): boolean {
  return Boolean(role.expiryDate && new Date(role.expiryDate).getTime() < Date.now())
}

function isExpiringSoon(role: SafetyRole): boolean {
  if (!role.expiryDate) return false
  const days = (new Date(role.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  return days > 0 && days <= 90
}

interface SafetyRolesTabProps {
  siteId:    string
  roles:     SafetyRole[]
  onChanged: () => void
}

export function SafetyRolesTab({ siteId, roles, onChanged }: SafetyRolesTabProps) {
  const t = useTranslations('sites')
  const [dialogOpen, setDialogOpen]   = useState(false)
  const [editTarget, setEditTarget]   = useState<SafetyRole | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SafetyRole | null>(null)
  const [deleting, setDeleting]       = useState(false)

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res  = await fetch(`/api/sites/${siteId}/safety-roles/${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json() as { ok: boolean; message?: string }
      if (json.ok) {
        toast.success(t('deleted'))
        setDeleteTarget(null)
        onChanged()
      } else {
        toast.error(json.message ?? t('errorDeleting'))
      }
    } catch {
      toast.error(t('errorDeleting'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)} className="flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          {t('addRole')}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-600" />{t('safetyOrganization')}</CardTitle></CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <p className="text-center text-gray-400 py-8">{t('noRoles')}</p>
          ) : (
            <div className="divide-y">
              {roles.map((role) => {
                const expired = isExpired(role)
                const expiring = !expired && isExpiringSoon(role)
                return (
                  <div key={role.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {t(`roleType.${role.roleType}`)}
                        </span>
                        {!role.isActive && (
                          <span className="text-xs text-gray-400">{t('inactive')}</span>
                        )}
                        {expired && (
                          <span className="text-xs font-medium text-red-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {t('expired')}
                          </span>
                        )}
                        {expiring && (
                          <span className="text-xs font-medium text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {t('expiringSoon')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">
                        {role.employee?.fullName ?? role.externalName ?? '—'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t('appointed')} {new Date(role.appointmentDate).toLocaleDateString()}
                        {role.expiryDate ? ` · ${t('expires')} ${new Date(role.expiryDate).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm" variant="ghost"
                        onClick={() => setEditTarget(role)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm" variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteTarget(role)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {dialogOpen && (
        <AddRoleDialog
          siteId={siteId}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onAdded={() => { setDialogOpen(false); onChanged() }}
        />
      )}

      {editTarget && (
        <EditRoleDialog
          siteId={siteId}
          role={editTarget}
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); onChanged() }}
        />
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open: boolean) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t('deleteConfirm')}</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">{t('deleteRoleConfirm')}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t('cancel')}</Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface EditRoleDialogProps {
  siteId:  string
  role:    SafetyRole
  open:    boolean
  onClose: () => void
  onSaved: () => void
}

function EditRoleDialog({ siteId, role, open, onClose, onSaved }: EditRoleDialogProps) {
  const t = useTranslations('sites')
  const [employees, setEmployees]         = useState<EmployeeRef[]>([])
  const [employeeId, setEmployeeId]       = useState(role.employeeId ?? '')
  const [externalName, setExternalName]   = useState(role.externalName ?? '')
  const [appointmentDate, setAppointmentDate] = useState(
    role.appointmentDate ? new Date(role.appointmentDate).toISOString().slice(0, 10) : ''
  )
  const [expiryDate, setExpiryDate]       = useState(
    role.expiryDate ? new Date(role.expiryDate).toISOString().slice(0, 10) : ''
  )
  const [notes, setNotes]                 = useState(role.notes ?? '')
  const [submitting, setSubmitting]       = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const res  = await fetch('/api/employees?limit=200')
        const json = await res.json() as { ok: boolean; data: { data: EmployeeRef[] } }
        if (json.ok) setEmployees(json.data.data ?? [])
      } catch { /* silent */ }
    })()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!appointmentDate) { toast.error(t('validationRequired')); return }
    setSubmitting(true)
    try {
      const res  = await fetch(`/api/sites/${siteId}/safety-roles/${role.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          employeeId:      employeeId || null,
          externalName:    externalName.trim() || null,
          appointmentDate,
          expiryDate:      expiryDate || null,
          notes:           notes.trim() || null,
        }),
      })
      const json = await res.json() as { ok: boolean; message?: string }
      if (json.ok) {
        toast.success(t('roleAdded'))
        onSaved()
      } else {
        toast.error(json.message ?? t('errorSaving'))
      }
    } catch {
      toast.error(t('errorSaving'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('addRole')} — <span className="text-blue-700">{t(`roleType.${role.roleType}`)}</span>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">{t('roleTypeLabel')}</label>
            <div className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded w-fit">
              {t(`roleType.${role.roleType}`)}
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="edit-role-employee" className="text-sm font-medium text-gray-700">{t('employee')}</label>
            <select
              id="edit-role-employee"
              className="w-full border rounded px-3 py-2 text-sm"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">— {t('selectEmployee')} —</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.fullName}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="edit-role-external" className="text-sm font-medium text-gray-700">{t('externalName')}</label>
            <Input
              id="edit-role-external"
              value={externalName}
              onChange={(e) => setExternalName(e.target.value)}
              placeholder={t('externalNameHint')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="edit-role-appt" className="text-sm font-medium text-gray-700">{t('appointmentDate')} *</label>
              <Input
                id="edit-role-appt"
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="edit-role-exp" className="text-sm font-medium text-gray-700">{t('expiryDate')}</label>
              <Input
                id="edit-role-exp"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="edit-role-notes" className="text-sm font-medium text-gray-700">{t('notes')}</label>
            <Input
              id="edit-role-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>{t('cancel')}</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface AddRoleDialogProps {
  siteId:  string
  open:    boolean
  onClose: () => void
  onAdded: () => void
}

function AddRoleDialog({ siteId, open, onClose, onAdded }: AddRoleDialogProps) {
  const t = useTranslations('sites')
  const [employees, setEmployees] = useState<EmployeeRef[]>([])
  const [roleType, setRoleType]       = useState<string>('RSPP')
  const [employeeId, setEmployeeId]   = useState('')
  const [externalName, setExternalName] = useState('')
  const [appointmentDate, setAppointmentDate] = useState('')
  const [expiryDate, setExpiryDate]   = useState('')
  const [notes, setNotes]             = useState('')
  const [submitting, setSubmitting]   = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const res  = await fetch('/api/employees?limit=200')
        const json = await res.json() as { ok: boolean; data: { data: EmployeeRef[] } }
        if (json.ok) setEmployees(json.data.data ?? [])
      } catch { /* silent */ }
    })()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!appointmentDate || (!employeeId && !externalName.trim())) {
      toast.error(t('validationRequired'))
      return
    }
    setSubmitting(true)
    try {
      const res  = await fetch(`/api/sites/${siteId}/safety-roles`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleType,
          employeeId:   employeeId || undefined,
          externalName: externalName.trim() || undefined,
          appointmentDate,
          expiryDate: expiryDate || undefined,
          notes: notes.trim() || undefined,
        }),
      })
      const json = await res.json() as { ok: boolean; message?: string }
      if (json.ok) {
        toast.success(t('roleAdded'))
        onAdded()
      } else {
        toast.error(json.message ?? t('errorSaving'))
      }
    } catch {
      toast.error(t('errorSaving'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t('addRole')}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('roleTypeLabel')} *</Label>
            <Select value={roleType} onValueChange={(v) => setRoleType(v ?? 'RSPP')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_TYPES.map((rt) => (
                  <SelectItem key={rt} value={rt}>{t(`roleType.${rt}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('employee')}</Label>
            <Select value={employeeId} onValueChange={(v) => setEmployeeId(v ?? '')}>
              <SelectTrigger><SelectValue placeholder={t('selectEmployee')} /></SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role-external">{t('externalName')}</Label>
            <Input
              id="role-external" value={externalName}
              onChange={(e) => setExternalName(e.target.value)}
              placeholder={t('externalNameHint')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="role-appt">{t('appointmentDate')} *</Label>
              <Input id="role-appt" type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-exp">{t('expiryDate')}</Label>
              <Input id="role-exp" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role-notes">{t('notes')}</Label>
            <Input id="role-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>{t('cancel')}</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
