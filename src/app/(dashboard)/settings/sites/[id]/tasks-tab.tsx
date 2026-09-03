'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  ChevronRight, ChevronDown, Plus, Loader2, Shield, Users, Wrench, Trash2,
} from 'lucide-react'
import type { ProcessRef, ActivityRef, TaskRef, WorkerGroup, SiteEquipmentItem } from './types'

// DVR standard hazard codes R01–R22
const HAZARD_CODES = [
  { code: 'R01', label: 'Crushing / entanglement' },
  { code: 'R02', label: 'Cutting / abrasion' },
  { code: 'R03', label: 'Impact from falling objects' },
  { code: 'R04', label: 'Falls from height' },
  { code: 'R05', label: 'Slips, trips and falls on level' },
  { code: 'R06', label: 'Electrical hazard' },
  { code: 'R07', label: 'Burn / contact with hot surfaces' },
  { code: 'R08', label: 'Fire and explosion' },
  { code: 'R09', label: 'Chemical agents' },
  { code: 'R10', label: 'Biological agents' },
  { code: 'R11', label: 'Noise exposure' },
  { code: 'R12', label: 'Vibration exposure' },
  { code: 'R13', label: 'Ionising / non-ionising radiation' },
  { code: 'R14', label: 'Ergonomic / musculoskeletal' },
  { code: 'R15', label: 'Work-related stress / psychosocial' },
  { code: 'R16', label: 'Vehicle / mobile plant' },
  { code: 'R17', label: 'Confined spaces' },
  { code: 'R18', label: 'Working at low temperature / cold' },
  { code: 'R19', label: 'Dust / airborne particles' },
  { code: 'R20', label: 'ATEX / explosive atmosphere' },
  { code: 'R21', label: 'Manual handling' },
  { code: 'R22', label: 'Other identified risk' },
]

interface HazardScreeningDialogProps {
  siteId:   string
  task:     TaskRef
  open:     boolean
  onClose:  () => void
  onSaved:  () => void
}

function HazardScreeningDialog({ siteId, task, open, onClose, onSaved }: HazardScreeningDialogProps) {
  const [saving, setSaving] = useState(false)
  const [screenings, setScreenings] = useState<Record<string, { applicable: boolean; justification: string }>>({})
  const [assessorName, setAssessorName] = useState('')

  useEffect(() => {
    if (!open) return
    const init: Record<string, { applicable: boolean; justification: string }> = {}
    for (const h of HAZARD_CODES) {
      const existing = task.hazardScreenings.find((s) => s.hazardCode === h.code)
      init[h.code] = {
        applicable:    existing?.isApplicable ?? false,
        justification: existing?.justification ?? '',
      }
    }
    setScreenings(init)
    setAssessorName(task.hazardScreenings[0]?.assessorName ?? '')
  }, [open, task.hazardScreenings])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/sites/${siteId}/tasks/${task.id}/hazards`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          screenings: HAZARD_CODES.map((h) => ({
            hazardCode:    h.code,
            isApplicable:  screenings[h.code]?.applicable ?? false,
            justification: screenings[h.code]?.justification || null,
            assessorName:  assessorName || null,
          })),
        }),
      })
      const json = await res.json()
      if (!json.ok) { toast.error(json.message ?? 'Failed to save screenings'); return }
      toast.success('Hazard screening saved')
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const screened = Object.values(screenings).filter((s) => s.applicable !== undefined).length
  const applicable = Object.values(screenings).filter((s) => s.applicable).length

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hazard Screening — {task.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <span>{screened}/{HAZARD_CODES.length} codes screened</span>
            <span>·</span>
            <span>{applicable} applicable</span>
          </div>

          <div>
            <Label htmlFor="assessorName">Assessor name</Label>
            <Input
              id="assessorName"
              value={assessorName}
              onChange={(e) => setAssessorName(e.target.value)}
              placeholder="Name of person conducting the screening"
              className="mt-1"
            />
          </div>

          <div className="border rounded divide-y text-sm">
            {HAZARD_CODES.map((h) => (
              <div key={h.code} className="px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-gray-500 w-10 shrink-0">{h.code}</span>
                  <span className="flex-1 text-gray-700">{h.label}</span>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={screenings[h.code]?.applicable ?? false}
                      onChange={(e) =>
                        setScreenings((prev) => ({
                          ...prev,
                          [h.code]: { ...prev[h.code]!, applicable: e.target.checked },
                        }))
                      }
                    />
                    <span className="text-xs">Applicable</span>
                  </label>
                </div>
                {screenings[h.code]?.applicable && (
                  <Input
                    className="mt-1.5 text-xs"
                    placeholder="Justification / notes (optional)"
                    value={screenings[h.code]?.justification ?? ''}
                    onChange={(e) =>
                      setScreenings((prev) => ({
                        ...prev,
                        [h.code]: { ...prev[h.code]!, justification: e.target.value },
                      }))
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save screening
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface AddItemDialogProps {
  title:       string
  label:       string
  open:        boolean
  onClose:     () => void
  onSubmit:    (name: string, description: string) => Promise<void>
}

function AddItemDialog({ title, label, open, onClose, onSubmit }: AddItemDialogProps) {
  const [name, setName]   = useState('')
  const [desc, setDesc]   = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (!open) { setName(''); setDesc('') } }, [open])

  async function handleSubmit() {
    if (!name.trim()) return
    setSaving(true)
    try { await onSubmit(name.trim(), desc.trim()) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="addName">{label}</Label>
            <Input
              id="addName" value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Enter ${label.toLowerCase()}`}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="addDesc">Description (optional)</Label>
            <Input
              id="addDesc" value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Optional description"
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface LinkGroupDialogProps {
  siteId:    string
  taskId:    string
  groups:    WorkerGroup[]
  linked:    string[]
  open:      boolean
  onClose:   () => void
  onSaved:   () => void
}

function LinkGroupDialog({ siteId, taskId, groups, linked, open, onClose, onSaved }: LinkGroupDialogProps) {
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState('')
  const available = groups.filter((g) => !linked.includes(g.id))

  async function handleLink() {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch(`/api/sites/${siteId}/tasks/${taskId}/worker-groups`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ groupId: selected }),
      })
      const json = await res.json()
      if (!json.ok) { toast.error(json.message ?? 'Failed to link group'); return }
      toast.success('Worker group linked')
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Link Worker Group</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <Label htmlFor="groupSelect">Worker group</Label>
          <select
            id="groupSelect"
            className="w-full border rounded px-3 py-2 text-sm"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Select a worker group…</option>
            {available.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleLink} disabled={saving || !selected}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface TaskRowProps {
  siteId:    string
  task:      TaskRef
  groups:    WorkerGroup[]
  equipment: SiteEquipmentItem[]
  onChanged: () => void
}

function TaskRow({ siteId, task, groups, equipment, onChanged }: TaskRowProps) {
  const [expanded, setExpanded]               = useState(false)
  const [screeningOpen, setScreeningOpen] = useState(false)
  const [linkGroupOpen, setLinkGroupOpen] = useState(false)
  const [selectedEquip, setSelectedEquip] = useState('')
  const [savingEquip, setSavingEquip]     = useState(false)

  const linkedGroupIds = task.workerGroups.map((wg) => wg.groupId)
  const linkedEquipIds = task.equipmentLinks.map((el) => el.equipmentId)
  const screened       = task.hazardScreenings.length
  const applicable     = task.hazardScreenings.filter((s) => s.isApplicable).length
  const screenedAll    = screened >= HAZARD_CODES.length

  async function unlinkGroup(groupId: string) {
    const res  = await fetch(`/api/sites/${siteId}/tasks/${task.id}/worker-groups/${groupId}`, { method: 'DELETE' })
    const json = await res.json()
    if (!json.ok) { toast.error('Failed to unlink group'); return }
    toast.success('Worker group unlinked')
    onChanged()
  }

  async function linkEquip() {
    if (!selectedEquip) return
    setSavingEquip(true)
    try {
      const res  = await fetch(`/api/sites/${siteId}/tasks/${task.id}/equipment`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ equipmentId: selectedEquip }),
      })
      const json = await res.json()
      if (!json.ok) { toast.error(json.message ?? 'Failed to link equipment'); return }
      toast.success('Equipment linked')
      setSelectedEquip('')
      onChanged()
    } finally {
      setSavingEquip(false)
    }
  }

  async function unlinkEquip(equipId: string) {
    const res  = await fetch(`/api/sites/${siteId}/tasks/${task.id}/equipment/${equipId}`, { method: 'DELETE' })
    const json = await res.json()
    if (!json.ok) { toast.error('Failed to unlink equipment'); return }
    toast.success('Equipment unlinked')
    onChanged()
  }

  const conditionFlags = [
    task.normalOp         && 'Normal',
    task.setupShutdown    && 'Setup/Shutdown',
    task.maintenance      && 'Maintenance',
    task.emergencyRecovery && 'Emergency',
    task.contractorWork   && 'Contractor',
  ].filter(Boolean)

  return (
    <div className="border rounded bg-white">
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded((v) => !v) }}
      >
        {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        <span className="font-medium text-sm flex-1">{task.name}</span>

        {/* hazard badge */}
        <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${screenedAll ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
          {screened}/{HAZARD_CODES.length} hazards
        </span>
        {applicable > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">
            {applicable} applicable
          </span>
        )}
        {/* condition flags */}
        <div className="flex gap-1">
          {conditionFlags.map((f) => (
            <span key={String(f)} className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{f}</span>
          ))}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t space-y-4 text-sm">
          {task.description && <p className="text-gray-500 text-xs">{task.description}</p>}

          {/* Worker groups */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-medium flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Worker groups</span>
              <Button type="button" size="sm" variant="outline" onClick={() => setLinkGroupOpen(true)} className="h-6 text-xs px-2">
                <Plus className="w-3 h-3 mr-1" /> Link
              </Button>
            </div>
            {task.workerGroups.length === 0
              ? <p className="text-gray-400 text-xs">No worker groups linked</p>
              : (
                <div className="flex flex-wrap gap-1.5">
                  {task.workerGroups.map((wg) => (
                    <span key={wg.groupId} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                      {wg.group.name}
                      <button
                        type="button"
                        onClick={() => unlinkGroup(wg.groupId)}
                        className="hover:text-red-600 ml-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
          </div>

          {/* Equipment */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-medium flex items-center gap-1"><Wrench className="w-3.5 h-3.5" /> Equipment</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {task.equipmentLinks.map((el) => (
                <span key={el.equipmentId} className="flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded-full">
                  {el.equipment.name}
                  <button type="button" onClick={() => unlinkEquip(el.equipmentId)} className="hover:text-red-600 ml-0.5">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <select
                  className="border rounded px-2 py-0.5 text-xs"
                  value={selectedEquip}
                  onChange={(e) => setSelectedEquip(e.target.value)}
                >
                  <option value="">Add equipment…</option>
                  {equipment.filter((eq) => !linkedEquipIds.includes(eq.id)).map((eq) => (
                    <option key={eq.id} value={eq.id}>{eq.name}</option>
                  ))}
                </select>
                {selectedEquip && (
                  <Button type="button" size="sm" className="h-6 text-xs px-2" onClick={linkEquip} disabled={savingEquip}>
                    {savingEquip ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Hazard screening */}
          <div>
            <Button type="button" size="sm" variant="outline" onClick={() => setScreeningOpen(true)} className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              {screened === 0 ? 'Start hazard screening' : 'Edit hazard screening (R01–R22)'}
            </Button>
          </div>
        </div>
      )}

      <HazardScreeningDialog
        siteId={siteId}
        task={task}
        open={screeningOpen}
        onClose={() => setScreeningOpen(false)}
        onSaved={onChanged}
      />
      <LinkGroupDialog
        siteId={siteId}
        taskId={task.id}
        groups={groups}
        linked={linkedGroupIds}
        open={linkGroupOpen}
        onClose={() => setLinkGroupOpen(false)}
        onSaved={onChanged}
      />
    </div>
  )
}

interface ActivityRowProps {
  siteId:      string
  act:         ActivityRef
  groups:      WorkerGroup[]
  equipment:   SiteEquipmentItem[]
  expanded:    Record<string, boolean>
  toggle:      (id: string) => void
  setAddTask:  (actId: string) => void
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  onRefresh:   () => void
}

function ActivityRow({ siteId, act, groups, equipment, expanded, toggle, setAddTask, setExpanded, onRefresh }: ActivityRowProps) {
  function handleAddTask() {
    setAddTask(act.id)
    setExpanded((p) => ({ ...p, [act.id]: true }))
  }

  return (
    <div className="border rounded">
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-t">
        <button
          type="button"
          onClick={() => toggle(act.id)}
          className="flex items-center gap-1.5 flex-1 text-left"
        >
          {expanded[act.id]
            ? <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
            : <ChevronRight className="w-3.5 h-3.5 text-blue-400" />}
          <span className="font-medium text-sm text-blue-800">{act.name}</span>
          <span className="text-xs text-blue-400">({act.tasks.length} tasks)</span>
        </button>
        <Button type="button" size="sm" variant="ghost" onClick={handleAddTask} className="h-6 text-xs">
          <Plus className="w-3 h-3 mr-1" /> Task
        </Button>
      </div>

      {expanded[act.id] && (
        <div className="p-2 space-y-2">
          {act.tasks.length === 0 && (
            <p className="text-gray-400 text-xs text-center py-2">No tasks yet.</p>
          )}
          {act.tasks.map((task: TaskRef) => (
            <TaskRow
              key={task.id}
              siteId={siteId}
              task={task}
              groups={groups}
              equipment={equipment}
              onChanged={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface TasksTabProps {
  siteId:    string
  groups:    WorkerGroup[]
  onChanged: () => void
}

export function TasksTab({ siteId, groups, onChanged }: TasksTabProps) {
  const [processes, setProcesses]     = useState<ProcessRef[]>([])
  const [equipment, setEquipment]     = useState<SiteEquipmentItem[]>([])
  const [loading, setLoading]         = useState(true)
  const [expanded, setExpanded]       = useState<Record<string, boolean>>({})
  const [addProc, setAddProc]         = useState(false)
  const [addAct, setAddAct]           = useState<string | null>(null)   // processId
  const [addTask, setAddTask]         = useState<string | null>(null)   // activityId

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [procRes, eqRes] = await Promise.all([
        fetch(`/api/sites/${siteId}/processes`),
        fetch(`/api/sites/${siteId}/equipment`),
      ])
      const [procJson, eqJson] = await Promise.all([procRes.json(), eqRes.json()])
      if (procJson.ok) setProcesses(procJson.data)
      if (eqJson.ok)   setEquipment(eqJson.data)
    } finally {
      setLoading(false)
    }
  }, [siteId])

  useEffect(() => { fetchAll() }, [fetchAll])

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function createProcess(name: string, description: string) {
    const res  = await fetch(`/api/sites/${siteId}/processes`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, description: description || undefined }),
    })
    const json = await res.json()
    if (!json.ok) { toast.error(json.message ?? 'Failed to create process'); return }
    toast.success('Process created')
    setAddProc(false)
    fetchAll()
    onChanged()
  }

  async function createActivity(processId: string, name: string, description: string) {
    const res  = await fetch(`/api/sites/${siteId}/processes/${processId}/activities`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, description: description || undefined }),
    })
    const json = await res.json()
    if (!json.ok) { toast.error(json.message ?? 'Failed to create activity'); return }
    toast.success('Activity created')
    setAddAct(null)
    fetchAll()
    onChanged()
  }

  async function createTask(activityId: string, name: string, description: string) {
    const res  = await fetch(`/api/sites/${siteId}/activities/${activityId}/tasks`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, description: description || undefined }),
    })
    const json = await res.json()
    if (!json.ok) { toast.error(json.message ?? 'Failed to create task'); return }
    toast.success('Task created')
    setAddTask(null)
    fetchAll()
    onChanged()
  }

  async function deleteProcess(processId: string) {
    const res  = await fetch(`/api/sites/${siteId}/processes/${processId}`, { method: 'DELETE' })
    const json = await res.json()
    if (!json.ok) { toast.error('Failed to delete process'); return }
    toast.success('Process deleted')
    fetchAll()
    onChanged()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Work Processes &amp; Task Inventory</CardTitle>
            <Button type="button" size="sm" onClick={() => setAddProc(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Process
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Organise site work into Processes → Activities → Tasks. Screen each task for applicable hazards (R01–R22) and assign worker groups.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {processes.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-6">
              No processes defined yet. Click &ldquo;Add Process&rdquo; to start.
            </p>
          )}

          {processes.map((proc) => (
            <div key={proc.id} className="border rounded">
              {/* Process header */}
              <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-t">
                <button
                  type="button"
                  onClick={() => toggle(proc.id)}
                  className="flex items-center gap-1.5 flex-1 text-left"
                >
                  {expanded[proc.id]
                    ? <ChevronDown className="w-4 h-4 text-gray-500" />
                    : <ChevronRight className="w-4 h-4 text-gray-500" />}
                  <span className="font-semibold text-sm">{proc.name}</span>
                  <span className="text-xs text-gray-400">({proc.activities.reduce((n, a) => n + a.tasks.length, 0)} tasks)</span>
                </button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setAddAct(proc.id); setExpanded((p) => ({ ...p, [proc.id]: true })) }} className="h-7 text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Activity
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => deleteProcess(proc.id)} className="h-7 text-xs text-red-600 hover:text-red-700">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>

              {expanded[proc.id] && (
                <div className="p-3 space-y-3">
                  {proc.activities.map((act) => (
                    <ActivityRow
                      key={act.id}
                      siteId={siteId}
                      act={act}
                      groups={groups}
                      equipment={equipment}
                      expanded={expanded}
                      toggle={toggle}
                      setAddTask={setAddTask}
                      setExpanded={setExpanded}
                      onRefresh={() => { void fetchAll(); onChanged() }}
                    />
                  ))}

                  {proc.activities.length === 0 && (
                    <p className="text-gray-400 text-xs text-center py-2">No activities yet.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <AddItemDialog
        title="Add Process"
        label="Process name"
        open={addProc}
        onClose={() => setAddProc(false)}
        onSubmit={createProcess}
      />
      <AddItemDialog
        title="Add Activity"
        label="Activity name"
        open={addAct !== null}
        onClose={() => setAddAct(null)}
        onSubmit={(name, desc) => createActivity(addAct!, name, desc)}
      />
      <AddItemDialog
        title="Add Task"
        label="Task name"
        open={addTask !== null}
        onClose={() => setAddTask(null)}
        onSubmit={(name, desc) => createTask(addTask!, name, desc)}
      />
    </div>
  )
}
