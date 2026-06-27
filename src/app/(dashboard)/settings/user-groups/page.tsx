'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Shield, ChevronRight, Users, Check, X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Permission {
  pageKey: string
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canApprove: boolean
}

interface UserGroup {
  id: string
  name: string
  description: string | null
  isActive: boolean
  _count: { members: number }
  permissions: Permission[]
}

// ─── Page keys definition ─────────────────────────────────────────────────────

const PAGE_KEYS: { key: string; label: string; category: string }[] = [
  { key: 'dashboard',       label: 'Dashboard',          category: 'Main' },
  { key: 'employees',       label: 'Employees',          category: 'Main' },
  { key: 'payroll',         label: 'Payroll',            category: 'Main' },
  { key: 'leave',           label: 'Leave Management',   category: 'Main' },
  { key: 'reports',         label: 'Reports',            category: 'Main' },
  { key: 'branches',        label: 'Branch Setup',       category: 'Admin' },
  { key: 'orgStructure',    label: 'Company Structure',  category: 'Admin' },
  { key: 'jobTitles',       label: 'Job Titles',         category: 'Admin' },
  { key: 'salaryComponents',label: 'Salary Components',  category: 'Admin' },
  { key: 'formulaBuilder',  label: 'Formula Builder',    category: 'Settings' },
  { key: 'taxTables',       label: 'Tax Tables',         category: 'Settings' },
  { key: 'users',           label: 'User Management',    category: 'Settings' },
  { key: 'settings',        label: 'General Settings',   category: 'Settings' },
]

const PERM_COLS: { key: keyof Omit<Permission, 'pageKey'>; label: string }[] = [
  { key: 'canView',   label: 'View' },
  { key: 'canCreate', label: 'Create' },
  { key: 'canEdit',   label: 'Edit' },
  { key: 'canDelete', label: 'Delete' },
  { key: 'canApprove',label: 'Approve' },
]

function emptyPermissions(): Permission[] {
  return PAGE_KEYS.map(({ key }) => ({
    pageKey: key,
    canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false,
  }))
}

function mergePermissions(saved: Permission[]): Permission[] {
  return PAGE_KEYS.map(({ key }) => {
    const found = saved.find((p) => p.pageKey === key)
    return found ?? { pageKey: key, canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false }
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface PermRowProps {
  readonly page: { key: string; label: string }
  readonly perm: Permission
  readonly onToggle: (pageKey: string, col: keyof Omit<Permission, 'pageKey'>) => void
}

function PermRow({ page, perm, onToggle }: PermRowProps) {
  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-2.5 font-medium text-gray-700">{page.label}</td>
      {PERM_COLS.map((col) => (
        <td key={col.key} className="text-center px-3 py-2.5">
          <button
            type="button"
            onClick={() => onToggle(page.key, col.key)}
            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mx-auto transition-colors ${
              perm[col.key]
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-gray-300 text-transparent hover:border-blue-300'
            }`}
            aria-label={`${perm[col.key] ? 'Revoke' : 'Grant'} ${col.label} on ${page.label}`}
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </td>
      ))}
    </tr>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UserGroupsPage() {
  const [groups, setGroups]           = useState<UserGroup[]>([])
  const [loading, setLoading]         = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>(emptyPermissions())
  const [savingPerms, setSavingPerms] = useState(false)
  const [dialogOpen, setDialogOpen]   = useState(false)
  const [deleteId, setDeleteId]       = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', isActive: true })
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)

  const loadGroups = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/user-groups')
      if (res.ok) setGroups(await res.json() as UserGroup[])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadGroups() }, [loadGroups])

  async function loadPermissions(groupId: string) {
    const res = await fetch(`/api/user-groups/${groupId}/permissions`)
    if (res.ok) {
      const data = await res.json() as Permission[]
      setPermissions(mergePermissions(data))
    } else {
      setPermissions(emptyPermissions())
    }
  }

  function selectGroup(g: UserGroup) {
    setSelectedGroup(g)
    void loadPermissions(g.id)
  }

  function togglePerm(pageKey: string, col: keyof Omit<Permission, 'pageKey'>) {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.pageKey !== pageKey) return p
        const updated = { ...p, [col]: !p[col] }
        // If enabling any write perm → auto-enable View
        if (col !== 'canView' && updated[col]) updated.canView = true
        // If disabling View → disable all
        if (col === 'canView' && !updated.canView) {
          updated.canCreate = false; updated.canEdit = false
          updated.canDelete = false; updated.canApprove = false
        }
        return updated
      })
    )
  }

  async function savePermissions() {
    if (!selectedGroup) return
    setSavingPerms(true)
    try {
      const res = await fetch(`/api/user-groups/${selectedGroup.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      })
      if (res.ok) {
        toast.success('Permissions saved')
      } else {
        const d = await res.json() as { error?: string }
        toast.error(d.error ?? 'Failed to save permissions')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSavingPerms(false)
    }
  }

  function openCreate() {
    setEditingId(null)
    setForm({ name: '', description: '', isActive: true })
    setDialogOpen(true)
  }

  function openEdit(g: UserGroup) {
    setEditingId(g.id)
    setForm({ name: g.name, description: g.description ?? '', isActive: g.isActive })
    setDialogOpen(true)
  }

  async function saveGroup() {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const url  = editingId ? `/api/user-groups/${editingId}` : '/api/user-groups'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success(editingId ? 'Group updated' : 'Group created')
        setDialogOpen(false)
        await loadGroups()
      } else {
        const d = await res.json() as { error?: string }
        toast.error(d.error ?? 'Failed to save group')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/user-groups/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Group deleted')
        if (selectedGroup?.id === deleteId) setSelectedGroup(null)
        await loadGroups()
      } else {
        const d = await res.json() as { error?: string }
        toast.error(d.error ?? 'Failed to delete')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setDeleteId(null)
    }
  }

  const categories = [...new Set(PAGE_KEYS.map((p) => p.category))]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Users Role Setup
          </h1>
          <p className="text-gray-500 text-sm mt-1">Create custom role groups and configure their page permissions</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          New Group
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — group list */}
        <div className="lg:col-span-1 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Role Groups</p>
          {loading && (
            <div className="text-sm text-gray-400 py-4 text-center">Loading…</div>
          )}
          {!loading && groups.length === 0 && (
            <div className="text-sm text-gray-400 py-8 text-center border-2 border-dashed rounded-xl">
              No groups yet. Create one to get started.
            </div>
          )}
          {groups.map((g) => (
            <div
              key={g.id}
              onClick={() => selectGroup(g)}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                selectedGroup?.id === g.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900 truncate">{g.name}</span>
                  {!g.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                </div>
                <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                  <Users className="w-3 h-3" />
                  <span>{g._count.members} user{g._count.members !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(g) }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                  aria-label="Edit group"
                  type="button"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteId(g.id) }}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                  aria-label="Delete group"
                  type="button"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <ChevronRight className={`w-4 h-4 transition-colors ${selectedGroup?.id === g.id ? 'text-blue-500' : 'text-gray-300'}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Right — permission matrix */}
        <div className="lg:col-span-2">
          {!selectedGroup ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed rounded-xl">
              <Shield className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Select a role group to configure its permissions</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-100">
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedGroup.name}</h3>
                  {selectedGroup.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{selectedGroup.description}</p>
                  )}
                </div>
                <Button size="sm" onClick={savePermissions} disabled={savingPerms} className="gap-1.5">
                  {savingPerms ? 'Saving…' : 'Save Permissions'}
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-48">Page / Module</th>
                      {PERM_COLS.map((col) => (
                        <th key={col.key} className="text-center px-3 py-2.5 font-medium text-gray-600 w-20">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => (
                      <React.Fragment key={cat}>
                        <tr className="bg-gray-50/50">
                          <td colSpan={6} className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            {cat}
                          </td>
                        </tr>
                        {PAGE_KEYS.filter((p) => p.category === cat).map((page) => {
                          const perm = permissions.find((p) => p.pageKey === page.key)!
                          return <PermRow key={page.key} page={page} perm={perm} onToggle={togglePerm} />
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Role Group' : 'New Role Group'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="grp-name">Group Name <span className="text-red-500">*</span></Label>
              <Input
                id="grp-name"
                placeholder="e.g. Payroll Officer"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grp-desc">Description</Label>
              <Input
                id="grp-desc"
                placeholder="Optional description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="grp-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
              <Label htmlFor="grp-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveGroup} disabled={saving}>
              {saving ? 'Saving…' : (editingId ? 'Save Changes' : 'Create Group')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Role Group</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            This will permanently delete the group and all its permissions. Users assigned to this group will lose their group association.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
