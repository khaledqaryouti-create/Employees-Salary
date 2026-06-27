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
import { Plus, Pencil, Trash2, Search, BookMarked } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface UniversityOption {
  id: string
  name: string
}

interface Faculty {
  id: string
  name: string
  nameAr: string | null
  isActive: boolean
  universityId: string
  university: { id: string; name: string }
}

const DEFAULT_FORM = { universityId: '', name: '', nameAr: '', isActive: true }
type FormState = typeof DEFAULT_FORM

// ── Component ──────────────────────────────────────────────────────────────────

export default function FacultiesPage() {
  const [items, setItems]               = useState<Faculty[]>([])
  const [universities, setUniversities] = useState<UniversityOption[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [filterUni, setFilterUni]       = useState('')
  const [dialogOpen, setDialogOpen]     = useState(false)
  const [editId, setEditId]             = useState<string | null>(null)
  const [form, setForm]                 = useState<FormState>(DEFAULT_FORM)
  const [saving, setSaving]             = useState(false)
  const [deleteId, setDeleteId]         = useState<string | null>(null)

  // Load university options once
  useEffect(() => {
    fetch('/api/universities?activeOnly=true')
      .then((r) => r.json())
      .then((j: { data?: UniversityOption[] }) => setUniversities(j.data ?? []))
      .catch(() => null)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ search })
      if (filterUni) params.set('universityId', filterUni)
      const res = await fetch(`/api/faculties?${params.toString()}`)
      if (res.ok) {
        const json = await res.json() as { ok: boolean; data: Faculty[] }
        setItems(json.data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [search, filterUni])

  useEffect(() => { void loadData() }, [loadData])

  function openCreate() {
    setEditId(null)
    setForm(DEFAULT_FORM)
    setDialogOpen(true)
  }

  function openEdit(f: Faculty) {
    setEditId(f.id)
    setForm({
      universityId: f.universityId,
      name:         f.name,
      nameAr:       f.nameAr ?? '',
      isActive:     f.isActive,
    })
    setDialogOpen(true)
  }

  async function save() {
    if (!form.universityId) { toast.error('Please select a university'); return }
    if (!form.name.trim())  { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const url    = editId ? `/api/faculties/${editId}` : '/api/faculties'
      const method = editId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          universityId: form.universityId,
          name:         form.name.trim(),
          nameAr:       form.nameAr.trim() || null,
          isActive:     form.isActive,
        }),
      })
      const json = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) { toast.error(json.error ?? 'Failed to save'); return }
      toast.success(editId ? 'Faculty updated' : 'Faculty created')
      setDialogOpen(false)
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(f: Faculty) {
    const res = await fetch(`/api/faculties/${f.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !f.isActive }),
    })
    if (res.ok) { await loadData() } else { toast.error('Failed to update status') }
  }

  async function deleteItem() {
    if (!deleteId) return
    const res = await fetch(`/api/faculties/${deleteId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Faculty deleted')
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
            <BookMarked className="w-6 h-6 text-blue-600" />
            Faculties
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage university faculties used in employee education records</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Faculty
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search faculties…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-64">
          <Select value={filterUni} onValueChange={(v) => setFilterUni(v ?? '')}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by university" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All universities</SelectItem>
              {universities.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Faculties List</CardTitle>
          <CardDescription>{items.length} entr{items.length === 1 ? 'y' : 'ies'}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Faculty Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Arabic Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">University</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Active</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-400">Loading…</td>
                  </tr>
                )}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-400">No faculties found</td>
                  </tr>
                )}
                {items.map((f) => (
                  <tr key={f.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{f.name}</td>
                    <td className="px-4 py-3 text-gray-600 text-right" dir="rtl">{f.nameAr ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{f.university.name}</td>
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={f.isActive}
                        onCheckedChange={() => { void toggleActive(f) }}
                        aria-label={`Toggle ${f.name} active status`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(f)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                          aria-label="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(f.id)}
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
            <DialogTitle>{editId ? 'Edit Faculty' : 'Add Faculty'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="fac-university">University <span className="text-red-500">*</span></Label>
              <Select
                value={form.universityId}
                onValueChange={(v) => setForm((f) => ({ ...f, universityId: v ?? '' }))}
              >
                <SelectTrigger id="fac-university">
                  <SelectValue placeholder="Select a university" />
                </SelectTrigger>
                <SelectContent>
                  {universities.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fac-name">Faculty Name <span className="text-red-500">*</span></Label>
              <Input
                id="fac-name"
                placeholder="e.g. Engineering, Medicine, Business"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fac-name-ar">Arabic Name</Label>
              <Input
                id="fac-name-ar"
                dir="rtl"
                placeholder="مثال: الهندسة، الطب، إدارة الأعمال"
                value={form.nameAr}
                onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="fac-active">Active</Label>
              <Switch
                id="fac-active"
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
            <DialogTitle>Delete Faculty</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            This faculty will be permanently deleted. This action cannot be undone.
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
