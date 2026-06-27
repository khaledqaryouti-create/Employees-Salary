'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TrendingUp, Plus, Trash2, Loader2, Pencil } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

interface Allowance {
  id:           string
  name:         string
  amount:       number
  isPercentage: boolean
}

interface AllowanceType {
  id:     string
  name:   string
  nameAr: string | null
}

interface Props {
  employeeId:         string
  currency:           string
  basicSalary:        number
  existingAllowances: Allowance[]
}

export function AllowancesPanel({
  employeeId,
  currency,
  basicSalary,
  existingAllowances,
}: Props) {
  const router = useRouter()
  const [open, setOpen]               = useState(false)
  const [saving, setSaving]           = useState(false)
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [allowanceTypes, setAllowanceTypes] = useState<AllowanceType[]>([])
  const [loadingTypes, setLoadingTypes]     = useState(false)

  // Add dialog state
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [amount, setAmount]                 = useState('')
  const [isPercentage, setIsPercentage]     = useState(false)

  // Edit dialog state
  const [editingAllowance, setEditingAllowance] = useState<Allowance | null>(null)
  const [editAmount, setEditAmount]             = useState('')
  const [editIsPercentage, setEditIsPercentage] = useState(false)
  const [editSaving, setEditSaving]             = useState(false)

  useEffect(() => {
    if (!open) return
    setLoadingTypes(true)
    fetch('/api/allowance-types?activeOnly=true')
      .then((r) => r.json())
      .then((json: { ok: boolean; data?: AllowanceType[] }) => {
        if (json.ok && json.data) setAllowanceTypes(json.data)
      })
      .catch(() => toast.error('Failed to load allowance types'))
      .finally(() => setLoadingTypes(false))
  }, [open])

  function handleOpen() {
    setSelectedTypeId('')
    setAmount('')
    setIsPercentage(false)
    setOpen(true)
  }

  async function handleSave() {
    if (!selectedTypeId) { toast.error('Please select an allowance type'); return }
    const value = Number.parseFloat(amount)
    if (Number.isNaN(value) || value < 0) { toast.error('Please enter a valid amount'); return }

    setSaving(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/allowances`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ allowanceTypeId: selectedTypeId, amount: value, isPercentage }),
      })
      const json = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) { toast.error(json.error ?? 'Failed to add allowance'); return }
      toast.success('Allowance added successfully')
      setOpen(false)
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(valueId: string) {
    setDeletingId(valueId)
    try {
      const res = await fetch(`/api/employees/${employeeId}/allowances/${valueId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        toast.error(json.error ?? 'Failed to delete allowance')
        return
      }
      toast.success('Allowance removed')
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  function handleEditOpen(a: Allowance) {
    setEditingAllowance(a)
    setEditAmount(String(a.amount))
    setEditIsPercentage(a.isPercentage)
  }

  async function handleEditSave() {
    if (!editingAllowance) return
    const value = Number.parseFloat(editAmount)
    if (Number.isNaN(value) || value < 0) { toast.error('Please enter a valid amount'); return }

    setEditSaving(true)
    try {
      const res = await fetch(
        `/api/employees/${employeeId}/allowances/${editingAllowance.id}`,
        {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ amount: value, isPercentage: editIsPercentage }),
        }
      )
      const json = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) { toast.error(json.error ?? 'Failed to update allowance'); return }
      toast.success('Allowance updated successfully')
      setEditingAllowance(null)
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setEditSaving(false)
    }
  }

  const resolvedAmount = (a: Allowance) =>
    a.isPercentage ? (basicSalary * a.amount) / 100 : a.amount

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" /> Allowances
            </CardTitle>
            <Button size="sm" variant="outline" onClick={handleOpen}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Allowance
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {existingAllowances.length === 0 ? (
            <div className="py-6 text-center">
              <TrendingUp className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No allowances configured</p>
              <p className="text-xs text-gray-300 mt-1">
                Click &ldquo;Add Allowance&rdquo; to attach an allowance to this employee.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 text-sm">
              {existingAllowances.map((a) => (
                <div key={a.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <TrendingUp className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <span className="text-gray-700 font-medium truncate">{a.name}</span>
                    {a.isPercentage && (
                      <span className="text-xs text-gray-400 shrink-0">({a.amount}% of basic)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-green-700">
                      + {formatCurrency(resolvedAmount(a), currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleEditOpen(a)}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                      aria-label={`Edit ${a.name}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(a.id)}
                      disabled={deletingId === a.id}
                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 disabled:opacity-40"
                      aria-label={`Remove ${a.name}`}
                    >
                      {deletingId === a.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                    </button>
                  </div>
                </div>
              ))}
              <div className="pt-2.5 flex justify-between font-semibold text-sm">
                <span className="text-gray-600">Total Allowances</span>
                <span className="font-mono text-green-700">
                  + {formatCurrency(existingAllowances.reduce((s, a) => s + resolvedAmount(a), 0), currency)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Allowance</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Allowance Type <span className="text-red-500">*</span></Label>
              {loadingTypes ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              ) : (
                <Select value={selectedTypeId} onValueChange={(v) => setSelectedTypeId(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select allowance type" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowanceTypes.length === 0 ? (
                      <SelectItem value="__none__" disabled>No active allowance types</SelectItem>
                    ) : (
                      allowanceTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Amount <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder={isPercentage ? 'e.g. 10 (%)' : 'e.g. 500.00'}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Percentage of Basic Salary</Label>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isPercentage ? 'Amount is a % of basic salary' : 'Amount is a fixed value'}
                </p>
              </div>
              <Switch checked={isPercentage} onCheckedChange={setIsPercentage} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="min-w-[100px]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Allowance Dialog */}
      <Dialog open={!!editingAllowance} onOpenChange={(o) => { if (!o) setEditingAllowance(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Allowance — {editingAllowance?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Amount <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder={editIsPercentage ? 'e.g. 10 (%)' : 'e.g. 500.00'}
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Percentage of Basic Salary</Label>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editIsPercentage ? 'Amount is a % of basic salary' : 'Amount is a fixed value'}
                </p>
              </div>
              <Switch checked={editIsPercentage} onCheckedChange={setEditIsPercentage} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAllowance(null)} disabled={editSaving}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={editSaving} className="min-w-[100px]">
              {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
