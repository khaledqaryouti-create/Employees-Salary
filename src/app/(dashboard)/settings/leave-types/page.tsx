'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, CalendarDays, Loader2, ToggleLeft } from 'lucide-react'

interface LeaveType {
  id: string
  name: string
  nameAr: string | null
  color: string | null
  isPaid: boolean
  defaultDays: number
  maxDaysPerYear: number | null
  carryOverDays: number
  isActive: boolean
  isDefault: boolean
  organizationId: string | null
}

type FormState = {
  name: string
  nameAr: string
  color: string
  isPaid: boolean
  defaultDays: string
  maxDaysPerYear: string
  carryOverDays: string
}

const DEFAULT_FORM: FormState = {
  name: '', nameAr: '', color: '#3b82f6',
  isPaid: true, defaultDays: '21', maxDaysPerYear: '', carryOverDays: '0',
}

export default function LeaveTypesPage() {
  const t = useTranslations('settings')
  const tc = useTranslations('common')

  const [types, setTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)

  async function loadTypes() {
    try {
      const res = await fetch('/api/leave/types')
      const json = await res.json()
      if (json.ok && json.data) setTypes(json.data)
    } catch {
      toast.error('Failed to load leave types')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTypes() }, [])

  function openCreate() {
    setEditingId(null)
    setForm(DEFAULT_FORM)
    setDialogOpen(true)
  }

  function openEdit(lt: LeaveType) {
    if (lt.isDefault) {
      toast.error('Default leave types cannot be edited here.')
      return
    }
    setEditingId(lt.id)
    setForm({
      name: lt.name,
      nameAr: lt.nameAr ?? '',
      color: lt.color ?? '#3b82f6',
      isPaid: lt.isPaid,
      defaultDays: String(lt.defaultDays),
      maxDaysPerYear: lt.maxDaysPerYear != null ? String(lt.maxDaysPerYear) : '',
      carryOverDays: String(lt.carryOverDays),
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Leave type name is required')
      return
    }
    setSaving(true)

    const payload = {
      name:           form.name.trim(),
      nameAr:         form.nameAr.trim() || null,
      color:          form.color,
      isPaid:         form.isPaid,
      defaultDays:    Number.parseInt(form.defaultDays) || 0,
      maxDaysPerYear: form.maxDaysPerYear ? Number.parseInt(form.maxDaysPerYear) : null,
      carryOverDays:  Number.parseInt(form.carryOverDays) || 0,
    }

    try {
      const url    = editingId ? `/api/leave/types/${editingId}` : '/api/leave/types'
      const method = editingId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (!json.ok) {
        toast.error(json.error ?? 'Failed to save')
        return
      }

      toast.success(editingId ? t('leaveTypeUpdated') : t('leaveTypeCreated'))
      setDialogOpen(false)
      await loadTypes()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(lt: LeaveType) {
    if (lt.isDefault) return
    try {
      const res = await fetch(`/api/leave/types/${lt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !lt.isActive }),
      })
      const json = await res.json()
      if (!json.ok) { toast.error(json.error ?? 'Failed to update'); return }
      setTypes((prev) => prev.map((x) => x.id === lt.id ? { ...x, isActive: !x.isActive } : x))
    } catch {
      toast.error('Something went wrong')
    }
  }

  async function handleDelete(lt: LeaveType) {
    if (lt.isDefault) { toast.error('Default leave types cannot be deleted'); return }
    if (!confirm(`Delete "${lt.name}"? This cannot be undone.`)) return

    try {
      const res = await fetch(`/api/leave/types/${lt.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.ok) { toast.error(json.error ?? 'Failed to delete'); return }
      toast.success(t('leaveTypeDeleted'))
      setTypes((prev) => prev.filter((x) => x.id !== lt.id))
    } catch {
      toast.error('Something went wrong')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const orgTypes     = types.filter((t) => !t.isDefault)
  const defaultTypes = types.filter((t) => t.isDefault)

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('leaveTypesTitle')}</h1>
          <p className="text-gray-500 mt-1 text-sm">{t('leaveTypesDesc')}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          {t('addLeaveType')}
        </Button>
      </div>

      {/* Organization-specific leave types */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-blue-600" />
            {t('customLeaveTypes')}
          </CardTitle>
          <CardDescription>{t('customLeaveTypesDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {orgTypes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">{t('noCustomLeaveTypes')}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-1" /> {t('addLeaveType')}
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {orgTypes.map((lt) => (
                <div key={lt.id} className="flex items-center justify-between py-3 gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: lt.color ?? '#6b7280' }}
                    />
                    <div>
                      <p className="font-medium text-sm">{lt.name}</p>
                      <p className="text-xs text-gray-400">
                        {lt.defaultDays} {t('defaultDaysLabel')}
                        {lt.maxDaysPerYear ? ` Â· max ${lt.maxDaysPerYear}/yr` : ''}
                        {lt.carryOverDays > 0 ? ` Â· carry ${lt.carryOverDays}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={lt.isPaid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                      {lt.isPaid ? t('paid') : t('unpaid')}
                    </Badge>
                    <button
                      onClick={() => handleToggleActive(lt)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                      title={lt.isActive ? tc('inactive') : tc('active')}
                    >
                      <ToggleLeft className={`w-4 h-4 ${lt.isActive ? 'text-green-500' : 'text-gray-300'}`} />
                    </button>
                    <button
                      onClick={() => openEdit(lt)}
                      className="text-gray-400 hover:text-blue-600 p-1"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(lt)}
                      className="text-gray-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Default / system leave types */}
      {defaultTypes.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-gray-500" />
              {t('systemLeaveTypes')}
            </CardTitle>
            <CardDescription>{t('systemLeaveTypesDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-100">
              {defaultTypes.map((lt) => (
                <div key={lt.id} className="flex items-center justify-between py-3 gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: lt.color ?? '#6b7280' }}
                    />
                    <div>
                      <p className="font-medium text-sm">{lt.name}</p>
                      <p className="text-xs text-gray-400">
                        {lt.defaultDays} {t('defaultDaysLabel')}
                        {lt.maxDaysPerYear ? ` Â· max ${lt.maxDaysPerYear}/yr` : ''}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">{t('systemDefault')}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? t('editLeaveType') : t('addLeaveType')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>{t('leaveTypeName')} *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Annual Leave"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>{t('leaveTypeNameAr')}</Label>
                <Input
                  value={form.nameAr}
                  onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
                  placeholder="Ø¥Ø¬Ø§Ø²Ø© Ø³Ù†ÙˆÙŠØ©"
                  dir="rtl"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>{t('defaultDaysLabel')}</Label>
                <Input
                  type="number" min="0"
                  value={form.defaultDays}
                  onChange={(e) => setForm((f) => ({ ...f, defaultDays: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('maxDaysPerYear')}</Label>
                <Input
                  type="number" min="0"
                  value={form.maxDaysPerYear}
                  placeholder="â€”"
                  onChange={(e) => setForm((f) => ({ ...f, maxDaysPerYear: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('carryOverDays')}</Label>
                <Input
                  type="number" min="0"
                  value={form.carryOverDays}
                  onChange={(e) => setForm((f) => ({ ...f, carryOverDays: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1.5 flex-1">
                <Label>{t('color')}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5"
                  />
                  <span className="text-sm font-mono text-gray-500">{form.color}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="isPaid">{t('isPaid')}</Label>
                <Switch
                  id="isPaid"
                  checked={form.isPaid}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isPaid: v }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{tc('cancel')}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
