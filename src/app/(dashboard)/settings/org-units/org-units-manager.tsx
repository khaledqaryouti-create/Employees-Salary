'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Network, Pencil, Trash2, Plus, Search, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

type Level = { id: string; name: string; depth: number; color: string | null }

type Unit = {
  id: string
  name: string
  code: string | null
  levelId: string
  level: Level
  parentId: string | null
  parent: { id: string; name: string } | null
  isActive: boolean
  order: number
  _count: { employees: number; children: number }
}

const EMPTY_FORM = { name: '', code: '', levelId: '', parentId: '' }

export default function OrgUnitsManager({
  initialUnits,
  levels,
}: {
  initialUnits: Unit[]
  levels: Level[]
}) {
  const [units, setUnits] = useState<Unit[]>(initialUnits)
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Unit | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null)

  // Units eligible as parents: same org, depth = selected level's depth - 1
  const selectedLevel = levels.find(l => l.id === form.levelId)
  const parentCandidates = useMemo(() => {
    if (!selectedLevel || selectedLevel.depth === 0) return []
    const parentLevel = levels.find(l => l.depth === selectedLevel.depth - 1)
    if (!parentLevel) return []
    return units.filter(u => u.levelId === parentLevel.id && u.isActive)
  }, [units, levels, selectedLevel])

  const filtered = useMemo(() => {
    return units.filter(u => {
      const matchSearch =
        !search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        (u.code ?? '').toLowerCase().includes(search.toLowerCase())
      const matchLevel = filterLevel === 'all' || u.levelId === filterLevel
      return matchSearch && matchLevel
    })
  }, [units, search, filterLevel])

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(unit: Unit) {
    setEditing(unit)
    setForm({
      name: unit.name,
      code: unit.code ?? '',
      levelId: unit.levelId,
      parentId: unit.parentId ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.levelId) return
    setLoading(true)
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        levelId: form.levelId,
        parentId: form.parentId || null,
      }

      if (editing) {
        const res = await fetch(`/api/org-units/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Failed to update')
        const updated: Unit = json
        setUnits(prev => prev.map(u => (u.id === updated.id ? { ...u, ...updated } : u)))
        toast.success('Unit updated')
      } else {
        const res = await fetch('/api/org-units', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Failed to create')
        const created: Unit = json
        setUnits(prev => [
          ...prev,
          { ...created, _count: created._count ?? { employees: 0, children: 0 } },
        ])
        toast.success('Unit added')
      }
      setDialogOpen(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(unit: Unit) {
    setLoading(true)
    try {
      const res = await fetch(`/api/org-units/${unit.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to delete')
      setUnits(prev => prev.filter(u => u.id !== unit.id))
      toast.success('Unit deleted')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setLoading(false)
      setDeleteTarget(null)
    }
  }

  async function toggleActive(unit: Unit) {
    try {
      const res = await fetch(`/api/org-units/${unit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !unit.isActive }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to update')
      const updated: Unit = json
      setUnits(prev => prev.map(u => (u.id === updated.id ? { ...u, ...updated } : u)))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to update')
    }
  }

  return (
    <>
      <div className="rounded-lg border bg-card">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 border-b">
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or code…"
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterLevel} onValueChange={(v) => setFilterLevel(v ?? '')}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              {levels.map(l => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={openAdd} className="ml-auto">
            <Plus className="h-4 w-4 mr-1" /> Add Unit
          </Button>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Network className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No units found</p>
            <p className="text-sm mt-1">
              {units.length === 0
                ? 'Click "Add Unit" to create your first organisational unit.'
                : 'Try adjusting your search or filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2">Code</th>
                  <th className="text-left px-4 py-2">Level</th>
                  <th className="text-left px-4 py-2">Parent</th>
                  <th className="text-center px-4 py-2">Employees</th>
                  <th className="text-center px-4 py-2">Children</th>
                  <th className="text-center px-4 py-2">Active</th>
                  <th className="text-right px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(unit => (
                  <tr key={unit.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{unit.name}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {unit.code ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className="text-white text-xs"
                        style={{ backgroundColor: unit.level.color ?? '#6b7280' }}
                      >
                        {unit.level.name}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {unit.parent ? (
                        <span className="flex items-center gap-1">
                          <ChevronRight className="h-3 w-3" />
                          {unit.parent.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">{unit._count.employees}</td>
                    <td className="px-4 py-3 text-center">{unit._count.children}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleActive(unit)}
                        className={`inline-block w-2 h-2 rounded-full ${unit.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                        title={unit.isActive ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                      />
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(unit)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(unit)}
                        disabled={unit._count.children > 0 || unit._count.employees > 0}
                        title={
                          unit._count.children > 0
                            ? 'Has child units'
                            : unit._count.employees > 0
                            ? 'Has employees assigned'
                            : 'Delete unit'
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Unit' : 'Add New Unit'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Level <span className="text-destructive">*</span></label>
              <Select
                value={form.levelId}
                onValueChange={v => setForm(f => ({ ...f, levelId: v ?? '', parentId: '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a level…" />
                </SelectTrigger>
                <SelectContent>
                  {levels.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} (depth {l.depth})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedLevel && selectedLevel.depth > 0 && (
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Parent {levels.find(l => l.depth === selectedLevel.depth - 1)?.name}
                  <span className="text-destructive"> *</span>
                </label>
                <Select
                  value={form.parentId}
                  onValueChange={v => setForm(f => ({ ...f, parentId: v ?? '' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent…" />
                  </SelectTrigger>
                  <SelectContent>
                    {parentCandidates.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium">Name <span className="text-destructive">*</span></label>
              <Input
                placeholder="e.g. Dubai Site, Finance Department"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Code <span className="text-muted-foreground">(optional)</span></label>
              <Input
                placeholder="e.g. DXB-001, FIN"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={
                loading ||
                !form.name.trim() ||
                !form.levelId ||
                (!!selectedLevel && selectedLevel.depth > 0 && !form.parentId)
              }
            >
              {loading ? 'Saving…' : editing ? 'Save Changes' : 'Add Unit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Unit</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={loading}
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              {loading ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
