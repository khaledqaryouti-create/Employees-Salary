'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Layers, Pencil, Trash2, Plus, GripVertical } from 'lucide-react'
import { toast } from 'sonner'

type Level = {
  id: string
  name: string
  depth: number
  color: string | null
  _count: { units: number }
}

const PRESET_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
]

export default function OrgLevelsManager({ initialLevels }: Readonly<{ initialLevels: Level[] }>) {
  const [levels, setLevels] = useState<Level[]>(initialLevels)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Level | null>(null)
  const [form, setForm] = useState({ name: '', color: PRESET_COLORS[0] })
  const [loading, setLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Level | null>(null)

  function openAdd() {
    setEditing(null)
    setForm({ name: '', color: PRESET_COLORS[levels.length % PRESET_COLORS.length] })
    setDialogOpen(true)
  }

  function openEdit(level: Level) {
    setEditing(level)
    setForm({ name: level.name, color: level.color ?? PRESET_COLORS[0] })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setLoading(true)
    try {
      if (editing) {
        const res = await fetch(`/api/org-unit-levels/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, color: form.color }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        const updated = await res.json()
        setLevels(levels.map(l => (l.id === updated.id ? { ...l, ...updated } : l)))
        toast.success('Level updated')
      } else {
        const res = await fetch('/api/org-unit-levels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, color: form.color, depth: levels.length }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        const created = await res.json()
        setLevels([...levels, { ...created, _count: { units: 0 } }])
        toast.success('Level added')
      }
      setDialogOpen(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(level: Level) {
    setLoading(true)
    try {
      const res = await fetch(`/api/org-unit-levels/${level.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      setLevels(levels.filter(l => l.id !== level.id))
      toast.success('Level deleted')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setLoading(false)
      setDeleteTarget(null)
    }
  }

  const saveLabel = editing ? 'Save Changes' : 'Add Level'

  return (
    <>
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Layers className="h-4 w-4" />
            <span>{levels.length} level{levels.length === 1 ? '' : 's'} defined</span>
          </div>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add Level
          </Button>
        </div>

        {levels.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Layers className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No levels defined yet</p>
            <p className="text-sm mt-1">Click &ldquo;Add Level&rdquo; to define your first hierarchy level (e.g. Site).</p>
          </div>
        ) : (
          <ul className="divide-y">
            {levels.map((level, idx) => (
              <li key={level.id} className="flex items-center gap-3 px-4 py-3">
                <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                <span
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: level.color ?? '#6b7280' }}
                >
                  {idx}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{level.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Depth {level.depth} &bull; {level._count.units} unit{level._count.units === 1 ? '' : 's'} assigned
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs">
                  Level {level.depth}
                </Badge>
                <Button variant="ghost" size="icon" onClick={() => openEdit(level)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(level)}
                  disabled={level._count.units > 0}
                  title={level._count.units > 0 ? 'Cannot delete — has units assigned' : 'Delete level'}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Level' : 'Add New Level'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label htmlFor="level-name-input" className="text-sm font-medium">Level Name</label>
              <Input
                id="level-name-input"
                placeholder="e.g. Site, Department, Section, Division"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
            </div>
            <div className="space-y-2">
              <label id="badge-color-label" className="text-sm font-medium">Badge Color</label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: form.color === c ? '#1e293b' : 'transparent',
                    }}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading || !form.name.trim()}>
              {loading ? 'Saving…' : saveLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Level</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete the <strong>{deleteTarget?.name}</strong> level?
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
