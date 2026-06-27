'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Search, Lightbulb } from 'lucide-react'

interface ClassificationOption {
  id: string
  name: string
}

interface Competency {
  id: string
  name: string
  nameAr: string | null
  description: string | null
  isActive: boolean
  classificationId: string
  classification: { id: string; name: string }
}

const DEFAULT_FORM = {
  classificationId: '',
  name:             '',
  nameAr:           '',
  description:      '',
  isActive:         true,
}
type FormState = typeof DEFAULT_FORM

export default function CompetenciesPage() {
  const [items, setItems]                                   = useState<Competency[]>([])
  const [classifications, setClassifications]               = useState<ClassificationOption[]>([])
  const [loading, setLoading]                               = useState(true)
  const [search, setSearch]                                 = useState('')
  const [filterClassification, setFilterClassification]     = useState('')
  const [dialogOpen, setDialogOpen]                         = useState(false)
  const [editId, setEditId]                                 = useState<string | null>(null)
  const [form, setForm]                                     = useState<FormState>(DEFAULT_FORM)
  const [saving, setSaving]                                 = useState(false)
  const [deleteId, setDeleteId]                             = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/competency-classifications?activeOnly=true')
      .then((r) => r.json())
      .then((j: { data?: ClassificationOption[] }) => setClassifications(j.data ?? []))
      .catch(() => null)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ search })
      if (filterClassification) params.set('classificationId', filterClassification)
      const res = await fetch(`/api/competencies?${params.toString()}`)
      if (res.ok) {
        const json = await res.json() as { ok: boolean; data: Competency[] }
        setItems(json.data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [search, filterClassification])

  useEffect(() => { loadData() }, [loadData])

  function openCreate() {
    setEditId(null)
    setForm(DEFAULT_FORM)
    setDialogOpen(true)
  }

  function openEdit(c: Competency) {
    setEditId(c.id)
    setForm({
      classificationId: c.classificationId,
      name:             c.name,
      nameAr:           c.nameAr ?? '',
      description:      c.description ?? '',
      isActive:         c.isActive,
    })
    setDialogOpen(true)
  }

  async function save() {
    if (!form.classificationId) { toast.error('Please select a classification'); return }
    if (!form.name.trim())      { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const url    = editId ? `/api/competencies/${editId}` : '/api/competencies'
      const method = editId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classificationId: form.classificationId,
          name:             form.name.trim(),
          nameAr:           form.nameAr.trim()      || null,
          description:      form.description.trim() || null,
          isActive:         form.isActive,
        }),
      })
      const json = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) { toast.error(json.error ?? 'Failed to save'); return }
      toast.success(editId ? 'Competency updated' : 'Competency created')
      setDialogOpen(false)
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(c: Competency) {
    const res = await fetch(`/api/competencies/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !c.isActive }),
    })
    if (res.ok) { await loadData() } else { toast.error('Failed to update status') }
  }

  async function deleteItem() {
    if (!deleteId) return
    const res = await fetch(`/api/competencies/${deleteId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Competency deleted')
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
            <Lightbulb className="w-6 h-6 text-blue-600" />
            Competencies
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage competencies linked to classifications for employee performance records
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Competency
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search competencies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-64">
          <Select value={filterClassification} onValueChange={(v) => setFilterClassification(v ?? '')}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by classification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All classifications</SelectItem>
              {classifications.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Competencies List</CardTitle>
          <CardDescription>
            {items.length} entr{items.length === 1 ? 'y' : 'ies'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Competency Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Arabic Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Classification</th>
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
                    <td colSpan={6} className="text-center py-10 text-gray-400">No competencies found</td>
                  </tr>
                )}
                {items.map((c) => (
                  <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600 text-right" dir="rtl">{c.nameAr ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{c.description ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{c.classification.name}</td>
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={c.isActive}
                        onCheckedChange={() => { void toggleActive(c) }}
                        aria-label={`Toggle ${c.name} active status`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                          aria-label="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(c.id)}
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
            <DialogTitle>{editId ? 'Edit Competency' : 'Add Competency'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="comp-classification">
                Classification <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.classificationId}
                onValueChange={(v) => setForm((f) => ({ ...f, classificationId: v ?? '' }))}
              >
                <SelectTrigger id="comp-classification">
                  <SelectValue placeholder="Select a classification" />
                </SelectTrigger>
                <SelectContent>
                  {classifications.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp-name">
                Competency Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="comp-name"
                placeholder="e.g. Problem Solving, Teamwork, Leadership"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp-name-ar">Arabic Name</Label>
              <Input
                id="comp-name-ar"
                dir="rtl"
                placeholder="مثال: حل المشكلات، العمل الجماعي، القيادة"
                value={form.nameAr}
                onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp-desc">Description</Label>
              <Input
                id="comp-desc"
                placeholder="Brief description of this competency"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="comp-active">Active</Label>
              <Switch
                id="comp-active"
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
            <DialogTitle>Delete Competency</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            This competency will be permanently deleted. This action cannot be undone.
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
