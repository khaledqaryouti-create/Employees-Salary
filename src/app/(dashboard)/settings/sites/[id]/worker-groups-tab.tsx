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
import { Plus, Loader2, Users, X, Trash2 } from 'lucide-react'
import type { WorkerGroup, EmployeeRef } from './types'

interface WorkerGroupsTabProps {
  siteId:    string
  groups:    WorkerGroup[]
  onChanged: () => void
}

export function WorkerGroupsTab({ siteId, groups, onChanged }: WorkerGroupsTabProps) {
  const t = useTranslations('sites')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [memberDialogGroup, setMemberDialogGroup] = useState<WorkerGroup | null>(null)

  async function deleteGroup(groupId: string) {
    try {
      const res  = await fetch(`/api/sites/${siteId}/worker-groups/${groupId}`, { method: 'DELETE' })
      const json = await res.json() as { ok: boolean; message?: string }
      if (json.ok) {
        toast.success(t('deleted'))
        onChanged()
      } else {
        toast.error(json.message ?? t('errorDeleting'))
      }
    } catch {
      toast.error(t('errorDeleting'))
    }
  }

  async function removeMember(groupId: string, employeeId: string) {
    try {
      const res  = await fetch(`/api/sites/${siteId}/worker-groups/${groupId}/members/${employeeId}`, { method: 'DELETE' })
      const json = await res.json() as { ok: boolean; message?: string }
      if (json.ok) {
        toast.success(t('memberRemoved'))
        onChanged()
      } else {
        toast.error(json.message ?? t('errorDeleting'))
      }
    } catch {
      toast.error(t('errorDeleting'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)} className="flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          {t('addGroup')}
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card><CardContent className="py-8"><p className="text-center text-gray-400">{t('noGroups')}</p></CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{group.code}</span>
                  {group.name}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button type="button" size="sm" variant="outline" onClick={() => setMemberDialogGroup(group)}>
                    <Users className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button" size="sm" variant="ghost"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => void deleteGroup(group.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {group.description && <p className="text-xs text-gray-500 mb-2">{group.description}</p>}
                {group.members.length === 0 ? (
                  <p className="text-xs text-gray-400">{t('noMembers')}</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {group.members.map((m) => (
                      <span key={m.id} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                        {m.employee.fullName}
                        <button
                          type="button"
                          onClick={() => void removeMember(group.id, m.employeeId)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {dialogOpen && (
        <AddGroupDialog
          siteId={siteId}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onAdded={() => { setDialogOpen(false); onChanged() }}
        />
      )}

      {memberDialogGroup && (
        <AddMemberDialog
          siteId={siteId}
          group={memberDialogGroup}
          open={!!memberDialogGroup}
          onClose={() => setMemberDialogGroup(null)}
          onAdded={() => { setMemberDialogGroup(null); onChanged() }}
        />
      )}
    </div>
  )
}

interface AddGroupDialogProps {
  siteId:  string
  open:    boolean
  onClose: () => void
  onAdded: () => void
}

function AddGroupDialog({ siteId, open, onClose, onAdded }: AddGroupDialogProps) {
  const t = useTranslations('sites')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || !name.trim()) {
      toast.error(t('validationRequired'))
      return
    }
    setSubmitting(true)
    try {
      const res  = await fetch(`/api/sites/${siteId}/worker-groups`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code: code.trim(), name: name.trim(), description: description.trim() || undefined }),
      })
      const json = await res.json() as { ok: boolean; message?: string }
      if (json.ok) {
        toast.success(t('groupAdded'))
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
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{t('addGroup')}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="grp-code">{t('groupCode')} *</Label>
            <Input id="grp-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="HG-01" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grp-name">{t('groupName')} *</Label>
            <Input id="grp-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grp-desc">{t('groupDescription')}</Label>
            <Input id="grp-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
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

interface AddMemberDialogProps {
  siteId:  string
  group:   WorkerGroup
  open:    boolean
  onClose: () => void
  onAdded: () => void
}

function AddMemberDialog({ siteId, group, open, onClose, onAdded }: AddMemberDialogProps) {
  const t = useTranslations('sites')
  const [employees, setEmployees] = useState<EmployeeRef[]>([])
  const [employeeId, setEmployeeId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const res  = await fetch('/api/employees?limit=200')
        const json = await res.json() as { ok: boolean; data: { data: EmployeeRef[] } }
        if (json.ok) setEmployees(json.data.data ?? [])
      } catch { /* silent */ }
    })()
  }, [])

  const existingIds = new Set(group.members.map((m) => m.employeeId))
  const available = employees.filter((e) => !existingIds.has(e.id))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId) {
      toast.error(t('validationRequired'))
      return
    }
    setSubmitting(true)
    try {
      const res  = await fetch(`/api/sites/${siteId}/worker-groups/${group.id}/members`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ employeeId }),
      })
      const json = await res.json() as { ok: boolean; message?: string }
      if (json.ok) {
        toast.success(t('memberAdded'))
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
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{t('addMemberTo', { group: group.name })}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('employee')} *</Label>
            <Select value={employeeId} onValueChange={(v) => setEmployeeId(v ?? '')}>
              <SelectTrigger><SelectValue placeholder={t('selectEmployee')} /></SelectTrigger>
              <SelectContent>
                {available.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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