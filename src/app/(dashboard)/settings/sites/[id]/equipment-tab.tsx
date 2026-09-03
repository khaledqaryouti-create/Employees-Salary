'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Loader2, AlertTriangle, Clock, CheckCircle2, Pencil, Trash2 } from 'lucide-react'
import type { SiteEquipmentItem } from './types'

const EQUIPMENT_CATEGORIES = [
  'Machinery',
  'Electrical',
  'Lifting equipment',
  'PPE',
  'Fire suppression',
  'Scaffolding',
  'Vehicles',
  'Measurement & testing',
  'Pressure vessels',
  'Other',
]

function inspectionStatus(item: SiteEquipmentItem): 'overdue' | 'soon' | 'ok' | 'none' {
  if (!item.nextInspectionDate) return 'none'
  const next = new Date(item.nextInspectionDate)
  const now  = new Date()
  if (next < now) return 'overdue'
  const diff = (next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (diff <= 30) return 'soon'
  return 'ok'
}

const STATUS_STYLES: Record<string, string> = {
  overdue: 'text-red-600 bg-red-50',
  soon:    'text-amber-600 bg-amber-50',
  ok:      'text-green-600 bg-green-50',
  none:    'text-gray-500 bg-gray-50',
}

interface EquipmentFormState {
  name:                      string
  category:                  string
  serialNumber:              string
  manufacturer:              string
  model:                     string
  certificationRef:          string
  inspectionFrequencyMonths: string
  lastInspectionDate:        string
  nextInspectionDate:        string
  notes:                     string
}

const EMPTY_FORM: EquipmentFormState = {
  name:                      '',
  category:                  '',
  serialNumber:              '',
  manufacturer:              '',
  model:                     '',
  certificationRef:          '',
  inspectionFrequencyMonths: '',
  lastInspectionDate:        '',
  nextInspectionDate:        '',
  notes:                     '',
}

function toDateInput(d: string | null | undefined): string {
  if (!d) return ''
  return new Date(d).toISOString().slice(0, 10)
}

function toForm(item: SiteEquipmentItem): EquipmentFormState {
  return {
    name:                      item.name,
    category:                  item.category,
    serialNumber:              item.serialNumber ?? '',
    manufacturer:              item.manufacturer ?? '',
    model:                     item.model ?? '',
    certificationRef:          item.certificationRef ?? '',
    inspectionFrequencyMonths: item.inspectionFrequencyMonths?.toString() ?? '',
    lastInspectionDate:        toDateInput(item.lastInspectionDate),
    nextInspectionDate:        toDateInput(item.nextInspectionDate),
    notes:                     item.notes ?? '',
  }
}

interface EquipmentDialogProps {
  siteId:    string
  item?:     SiteEquipmentItem
  open:      boolean
  onClose:   () => void
  onSaved:   () => void
}

function EquipmentDialog({ siteId, item, open, onClose, onSaved }: EquipmentDialogProps) {
  const [form, setForm]     = useState<EquipmentFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(item ? toForm(item) : EMPTY_FORM)
  }, [open, item])

  function set(field: keyof EquipmentFormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.name.trim() || !form.category.trim()) return
    setSaving(true)
    try {
      const payload = {
        name:                      form.name.trim(),
        category:                  form.category,
        serialNumber:              form.serialNumber   || null,
        manufacturer:              form.manufacturer   || null,
        model:                     form.model          || null,
        certificationRef:          form.certificationRef || null,
        inspectionFrequencyMonths: form.inspectionFrequencyMonths
          ? Number.parseInt(form.inspectionFrequencyMonths, 10)
          : null,
        lastInspectionDate:        form.lastInspectionDate || null,
        nextInspectionDate:        form.nextInspectionDate || null,
        notes:                     form.notes || null,
      }

      const url    = item ? `/api/sites/${siteId}/equipment/${item.id}` : `/api/sites/${siteId}/equipment`
      const method = item ? 'PATCH' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.ok) { toast.error(json.message ?? 'Failed to save equipment'); return }
      toast.success(item ? 'Equipment updated' : 'Equipment added')
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Equipment' : 'Add Equipment'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="eqName">Name *</Label>
              <Input id="eqName" value={form.name} onChange={(e) => set('name', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="eqCat">Category *</Label>
              <select
                id="eqCat"
                className="w-full border rounded px-3 py-2 mt-1 text-sm"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
              >
                <option value="">Select category…</option>
                {EQUIPMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="eqSerial">Serial number</Label>
              <Input id="eqSerial" value={form.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="eqMfr">Manufacturer</Label>
              <Input id="eqMfr" value={form.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="eqModel">Model</Label>
              <Input id="eqModel" value={form.model} onChange={(e) => set('model', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="eqCert">Certification / CE ref</Label>
              <Input id="eqCert" value={form.certificationRef} onChange={(e) => set('certificationRef', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="eqFreq">Inspection frequency (months)</Label>
              <Input id="eqFreq" type="number" min={1} value={form.inspectionFrequencyMonths} onChange={(e) => set('inspectionFrequencyMonths', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="eqLast">Last inspection date</Label>
              <Input id="eqLast" type="date" value={form.lastInspectionDate} onChange={(e) => set('lastInspectionDate', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="eqNext">Next inspection date</Label>
              <Input id="eqNext" type="date" value={form.nextInspectionDate} onChange={(e) => set('nextInspectionDate', e.target.value)} className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label htmlFor="eqNotes">Notes</Label>
              <Input id="eqNotes" value={form.notes} onChange={(e) => set('notes', e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSave} disabled={saving || !form.name.trim() || !form.category}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {item ? 'Save changes' : 'Add equipment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface EquipmentTabProps {
  siteId:    string
  onChanged: () => void
}

export function EquipmentTab({ siteId, onChanged }: EquipmentTabProps) {
  const [items, setItems]       = useState<SiteEquipmentItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [editItem, setEditItem] = useState<SiteEquipmentItem | undefined>(undefined)
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/sites/${siteId}/equipment`)
      const json = await res.json()
      if (json.ok) setItems(json.data)
    } finally {
      setLoading(false)
    }
  }, [siteId])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function deleteItem(id: string) {
    const res  = await fetch(`/api/sites/${siteId}/equipment/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!json.ok) { toast.error('Failed to delete equipment'); return }
    toast.success('Equipment removed')
    fetchAll()
    onChanged()
  }

  const overdue = items.filter((i) => inspectionStatus(i) === 'overdue').length
  const soon    = items.filter((i) => inspectionStatus(i) === 'soon').length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {overdue > 0 && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded px-4 py-2.5 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span><strong>{overdue}</strong> piece(s) of equipment have overdue inspections — this blocks Gate 5.</span>
        </div>
      )}
      {soon > 0 && overdue === 0 && (
        <div className="flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 rounded px-4 py-2.5 text-sm">
          <Clock className="w-4 h-4 shrink-0" />
          <span><strong>{soon}</strong> piece(s) of equipment have inspections due within 30 days.</span>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Site Equipment Register</CardTitle>
            <Button type="button" size="sm" onClick={() => { setEditItem(undefined); setDialogOpen(true) }}>
              <Plus className="w-4 h-4 mr-1" /> Add Equipment
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Register machinery, tools, and equipment used at this site. Track inspection dates and certification references.
          </p>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">
              No equipment registered yet. Click &ldquo;Add Equipment&rdquo; to start.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-gray-500 uppercase tracking-wide">
                    <th className="text-left py-2 pr-4">Name</th>
                    <th className="text-left py-2 pr-4">Category</th>
                    <th className="text-left py-2 pr-4">Serial / Model</th>
                    <th className="text-left py-2 pr-4">Next inspection</th>
                    <th className="text-left py-2 pr-4">Used in tasks</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => {
                    const status = inspectionStatus(item)
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="py-2.5 pr-4 font-medium">{item.name}</td>
                        <td className="py-2.5 pr-4 text-gray-500">{item.category}</td>
                        <td className="py-2.5 pr-4 text-gray-500">
                          {[item.serialNumber, item.model].filter(Boolean).join(' / ') || '—'}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[status]}`}>
                            {status === 'overdue'  && <AlertTriangle className="w-3 h-3" />}
                            {status === 'soon'     && <Clock className="w-3 h-3" />}
                            {status === 'ok'       && <CheckCircle2 className="w-3 h-3" />}
                            {status === 'none'     ? 'Not scheduled' : new Date(item.nextInspectionDate!).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-gray-500">
                          {item.taskLinks.length > 0
                            ? <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{item.taskLinks.length} task(s)</span>
                            : <span className="text-xs text-gray-400">None</span>}
                        </td>
                        <td className="py-2.5 flex items-center gap-1 justify-end">
                          <Button
                            type="button"
                            size="sm" variant="ghost"
                            onClick={() => { setEditItem(item); setDialogOpen(true) }}
                            className="h-7 px-2"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="sm" variant="ghost"
                            onClick={() => deleteItem(item.id)}
                            className="h-7 px-2 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <EquipmentDialog
        siteId={siteId}
        item={editItem}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => { fetchAll(); onChanged() }}
      />
    </div>
  )
}
