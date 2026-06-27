'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Search, Clock, Settings2 } from 'lucide-react'

interface OvertimeType {
  id:                  string
  name:                string
  nameAr:              string | null
  description:         string | null
  isActive:            boolean
  includeInSalaryCalc: boolean
}

const DEFAULT_FORM = { name: '', nameAr: '', description: '', isActive: true }
type FormState = typeof DEFAULT_FORM

export default function OvertimeTypesPage() {
  const router = useRouter()
  const [items, setItems]           = useState<OvertimeType[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId]         = useState<string | null>(null)
  const [form, setForm]             = useState<FormState>(DEFAULT_FORM)
  const [saving, setSaving]         = useState(false)
  const [deleteId, setDeleteId]     = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ search })
      const res = await fetch(`/api/overtime-types?${params.toString()}`)
      if (res.ok) {
        const json = await res.json() as { ok: boolean; data: OvertimeType[] }
        setItems(json.data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { void loadData() }, [loadData])

  function openCreate() {
    setEditId(null)
    setForm(DEFAULT_FORM)
    setDialogOpen(true)
  }

  function openEdit(item: OvertimeType) {
    setEditId(item.id)
    setForm({
      name:        item.name,
      nameAr:      item.nameAr      ?? '',
      description: item.description ?? '',
      isActive:    item.isActive,
    })
    setDialogOpen(true)
  }

  async function save() {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const url    = editId ? `/api/overtime-types/${editId}` : '/api/overtime-types'
      const method = editId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        form.name.trim(),
          nameAr:      form.nameAr.trim()      || null,
          description: form.description.trim() || null,
          isActive:    form.isActive,
        }),
      })
      const json = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) { toast.error(json.error ?? 'Failed to save'); return }
      toast.success(editId ? 'Overtime type updated' : 'Overtime type created')
      setDialogOpen(false)
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(item: OvertimeType) {
    const res = await fetch(`/api/overtime-types/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !item.isActive }),
    })
    if (res.ok) { await loadData() } else { toast.error('Failed to update status') }
  }

  async function deleteItem() {
    if (!deleteId) return
    const res = await fetch(`/api/overtime-types/${deleteId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Overtime type deleted')
      await loadData()
    } else {
      const json = await res.json() as { error?: string }
      toast.error(json.error ?? 'Failed to delete')
    }
    setDeleteId(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-600" />
            Overtime Types
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage overtime type categories and configure their rules for payroll calculation
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Overtime Type
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search overtime types…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Overtime Types List</CardTitle>
          <CardDescription>
            {items.length} entr{items.length === 1 ? 'y' : 'ies'} — click <strong>Configure Rules</strong> to set hours limits, rates, and salary calculation settings per type
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Arabic Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Payroll</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Active</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400">Loading…</td>
                  </tr>
                )}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400">No overtime types found</td>
                  </tr>
                )}
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                    <td className="px-4 py-3 text-gray-600 text-right" dir="rtl">{item.nameAr ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{item.description ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {item.includeInSalaryCalc && (
                        <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                          Salary
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={item.isActive}
                        onCheckedChange={() => { void toggleActive(item) }}
                        aria-label={`Toggle ${item.name} active status`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => router.push(`/settings/overtime-types/${item.id}/rules`)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"
                          aria-label="Configure Rules"
                          title="Configure Rules"
                        >
                          <Settings2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                          aria-label="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(item.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Overtime Type' : 'Add Overtime Type'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ovt-name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="ovt-name"
                placeholder="e.g. Weekday, Weekend, Holiday, Night Shift"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ovt-name-ar">Arabic Name</Label>
              <Input
                id="ovt-name-ar"
                dir="rtl"
                placeholder="مثال: يوم عمل، عطلة نهاية الأسبوع، إجازة، وردية ليلية"
                value={form.nameAr}
                onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ovt-desc">Description</Label>
              <Input
                id="ovt-desc"
                placeholder="Brief description of this overtime type"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="ovt-active">Active</Label>
              <Switch
                id="ovt-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Overtime Type</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            This overtime type and all its configured rules will be permanently deleted. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={deleteItem}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
