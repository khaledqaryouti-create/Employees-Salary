'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, UserX, Search, Users, Building2, Shield, Mail } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string
  fullName: string
  email: string
  role: string
  isActive: boolean
  branch: { id: string; name: string } | null
  userGroups: { group: { id: string; name: string } }[]
}

interface Branch {
  id: string
  name: string
  code: string | null
  isHeadQuarter: boolean
}

interface UserGroup {
  id: string
  name: string
  isActive: boolean
}

const ROLES = [
  { value: 'TENANT_ADMIN', label: 'Tenant Admin' },
  { value: 'HR_ADMIN',     label: 'HR Admin' },
  { value: 'MANAGER',      label: 'Manager' },
  { value: 'EMPLOYEE',     label: 'Employee' },
]

const DEFAULT_FORM = {
  fullName: '', email: '', password: '', confirmPassword: '', role: 'EMPLOYEE',
  branchId: '', groupId: '',
}

type FormState = typeof DEFAULT_FORM

// ─── Component ────────────────────────────────────────────────────────────────

export default function UsersSetupPage() {
  const [users, setUsers]       = useState<UserProfile[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [groups, setGroups]     = useState<UserGroup[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId]     = useState<string | null>(null)
  const [form, setForm]         = useState<FormState>(DEFAULT_FORM)
  const [saving, setSaving]     = useState(false)
  const [deactivateId, setDeactivateId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [usersRes, branchesRes, groupsRes] = await Promise.all([
        fetch(`/api/settings/users?search=${encodeURIComponent(search)}`),
        fetch('/api/branches'),
        fetch('/api/user-groups'),
      ])
      if (usersRes.ok)   setUsers(await usersRes.json() as UserProfile[])
      if (branchesRes.ok) {
        const b = await branchesRes.json() as { data?: Branch[] } | Branch[]
        setBranches(Array.isArray(b) ? b : (b.data ?? []))
      }
      if (groupsRes.ok) setGroups((await groupsRes.json() as UserGroup[]).filter((g) => g.isActive))
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { loadData() }, [loadData])

  function openCreate() {
    setEditId(null)
    setForm(DEFAULT_FORM)
    setDialogOpen(true)
  }

  function openEdit(u: UserProfile) {
    setEditId(u.id)
    setForm({
      fullName:        u.fullName,
      email:           u.email,
      role:            u.role,
      branchId:        u.branch?.id ?? '',
      groupId:         u.userGroups[0]?.group.id ?? '',
      password:        '',
      confirmPassword: '',
    })
    setDialogOpen(true)
  }

  async function saveUser() {
    if (!form.fullName.trim()) { toast.error('Full name is required'); return }
    if (!editId && !form.email.trim()) { toast.error('Email is required'); return }
    if (!editId && form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (!editId && form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return }

    setSaving(true)
    try {
      if (editId) {
        const res = await fetch(`/api/settings/users/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: form.fullName,
            role:     form.role,
            branchId: form.branchId || null,
            groupId:  form.groupId  || null,
          }),
        })
        if (res.ok) {
          toast.success('User updated')
          setDialogOpen(false)
          await loadData()
        } else {
          const d = await res.json() as { error?: string }
          toast.error(d.error ?? 'Failed to update user')
        }
      } else {
        const res = await fetch('/api/settings/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: form.fullName,
            email:    form.email,
            password: form.password,
            role:     form.role,
            branchId: form.branchId || null,
            groupId:  form.groupId  || null,
          }),
        })
        if (res.ok) {
          toast.success('User created successfully')
          setDialogOpen(false)
          await loadData()
        } else {
          const d = await res.json() as { error?: string }
          toast.error(d.error ?? 'Failed to create user')
        }
      }
    } finally {
      setSaving(false)
    }
  }

  async function deactivateUser() {
    if (!deactivateId) return
    const res = await fetch(`/api/settings/users/${deactivateId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('User deactivated')
      await loadData()
    } else {
      const d = await res.json() as { error?: string }
      toast.error(d.error ?? 'Failed to deactivate')
    }
    setDeactivateId(null)
  }

  const roleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label ?? r.replaceAll('_', ' ')

  const roleBadgeColor = (r: string) => {
    const map: Record<string, string> = {
      SUPER_ADMIN:  'bg-purple-100 text-purple-700',
      TENANT_ADMIN: 'bg-blue-100 text-blue-700',
      HR_ADMIN:     'bg-teal-100 text-teal-700',
      MANAGER:      'bg-orange-100 text-orange-700',
      EMPLOYEE:     'bg-gray-100 text-gray-600',
    }
    return map[r] ?? 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Users Setup
          </h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage user accounts, roles, and branch assignments</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Add User
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Group</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Branch</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">Loading…</td>
                </tr>
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">No users found</td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{u.fullName}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3" />
                      {u.email}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleBadgeColor(u.role)}`}>
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.userGroups.length > 0 ? (
                      <div className="flex items-center gap-1 text-xs text-gray-700">
                        <Shield className="w-3 h-3 text-blue-500" />
                        {u.userGroups[0]!.group.name}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.branch ? (
                      <div className="flex items-center gap-1 text-xs text-gray-700">
                        <Building2 className="w-3 h-3 text-blue-500" />
                        {u.branch.name}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={u.isActive ? 'default' : 'secondary'} className="text-xs">
                      {u.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                        aria-label="Edit user"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {u.isActive && (
                        <button
                          type="button"
                          onClick={() => setDeactivateId(u.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                          aria-label="Deactivate user"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit User' : 'Add New User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="u-name">Full Name <span className="text-red-500">*</span></Label>
              <Input
                id="u-name"
                placeholder="John Smith"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </div>

            {!editId && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="u-email">Email Address <span className="text-red-500">*</span></Label>
                  <Input
                    id="u-email"
                    type="email"
                    placeholder="user@company.com"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="u-password">Password <span className="text-red-500">*</span></Label>
                  <Input
                    id="u-password"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="u-confirm-password">Confirm Password <span className="text-red-500">*</span></Label>
                  <Input
                    id="u-confirm-password"
                    type="password"
                    placeholder="Repeat password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="u-role">System Role <span className="text-red-500">*</span></Label>
              <select
                id="u-role"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="u-group">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  Role Group
                </span>
              </Label>
              <select
                id="u-group"
                value={form.groupId}
                onChange={(e) => setForm((f) => ({ ...f, groupId: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">— No group —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="u-branch">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  Branch
                </span>
              </Label>
              <select
                id="u-branch"
                value={form.branchId}
                onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">— No branch —</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}{b.isHeadQuarter ? ' (HQ)' : ''}{b.code ? ` [${b.code}]` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveUser} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate confirmation */}
      <Dialog open={!!deactivateId} onOpenChange={() => setDeactivateId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Deactivate User</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            This user will be deactivated and will no longer be able to log in. You can reactivate them later by editing the account.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={deactivateUser}>
              <UserX className="w-4 h-4 mr-1" /> Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
