'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Loader2, Pencil } from 'lucide-react'

const CURRENCIES = [
  'SAR', 'AED', 'KWD', 'BHD', 'QAR', 'OMR',
  'EGP', 'MAD', 'TND', 'INR', 'PHP', 'PKR',
  'BDT', 'EUR', 'USD',
]

interface Props {
  employeeId: string
  currentSalary: number
  currentCurrency: string
}

export function EditSalaryButton({ employeeId, currentSalary, currentCurrency }: Props) {
  const router = useRouter()
  const [open, setOpen]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [salary, setSalary]     = useState(String(currentSalary))
  const [currency, setCurrency] = useState(currentCurrency)

  function handleOpen() {
    setSalary(String(currentSalary))
    setCurrency(currentCurrency)
    setOpen(true)
  }

  async function handleSave() {
    const value = Number.parseFloat(salary)
    if (Number.isNaN(value) || value < 0) {
      toast.error('Please enter a valid salary amount')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ basicSalary: value, currency }),
      })
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        toast.error(err.error ?? 'Failed to update salary')
        return
      }
      toast.success('Salary updated successfully')
      setOpen(false)
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        <Pencil className="w-3.5 h-3.5 mr-1.5" />
        Edit Salary
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Basic Salary</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Basic Salary *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency *</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v ?? '')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading} className="min-w-[100px]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
