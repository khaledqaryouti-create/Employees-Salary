'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LinkButton } from '@/components/ui/link-button'
import { Loader2, ArrowLeft, AlertCircle, PlayCircle } from 'lucide-react'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function NewPayrollRunPage() {
  const router = useRouter()
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [loading, setLoading] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  async function handleRun() {
    setLoading(true)
    setRunError(null)

    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || `Payroll – ${MONTHS[parseInt(month) - 1]} ${year}`,
          periodMonth: parseInt(month),
          periodYear: parseInt(year),
          currency,
        }),
      })

      const json = await res.json() as {
        ok: boolean
        message?: string
        data?: { id: string }
      }

      if (!json.ok) {
        setRunError(json.message ?? 'Failed to start payroll run')
        return
      }

      toast.success('Payroll run started! Processing employees…')
      router.push(`/payroll/${json.data?.id}`)
    } catch {
      setRunError('A network error occurred. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <LinkButton variant="ghost" href="/payroll" size="sm">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </LinkButton>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Payroll Run</h1>
          <p className="text-sm text-gray-500">Configure and run payroll for all active employees</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Payroll Period</CardTitle>
          <CardDescription>
            All active employees will be processed for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Run Name (optional)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. January 2026 – Main Run"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Month <span className="text-red-500">*</span></Label>
              <Select value={month} onValueChange={(v) => { if (v) setMonth(v) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Year <span className="text-red-500">*</span></Label>
              <Select value={year} onValueChange={(v) => { if (v) setYear(v) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Base Currency</Label>
            <Select value={currency} onValueChange={(v) => { if (v) setCurrency(v) }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD – US Dollar</SelectItem>
                <SelectItem value="SAR">SAR – Saudi Riyal</SelectItem>
                <SelectItem value="AED">AED – UAE Dirham</SelectItem>
                <SelectItem value="EUR">EUR – Euro</SelectItem>
                <SelectItem value="INR">INR – Indian Rupee</SelectItem>
                <SelectItem value="EGP">EGP – Egyptian Pound</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {runError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">Run Failed</p>
            <p className="text-sm text-red-600 mt-0.5">{runError}</p>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-medium">What happens when you run payroll?</p>
        <ul className="mt-2 space-y-1 text-blue-700 list-disc list-inside">
          <li>All active employees for the selected period are retrieved</li>
          <li>Country-specific formulas are applied (GOSI, income tax, allowances, etc.)</li>
          <li>Payslips are generated for each employee</li>
          <li>Results are saved as a draft — you can review before approving</li>
        </ul>
      </div>

      <div className="flex items-center justify-end gap-3">
        <LinkButton variant="outline" href="/payroll">Cancel</LinkButton>
        <Button onClick={handleRun} disabled={loading} className="min-w-[160px]">
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</>
          ) : (
            <><PlayCircle className="w-4 h-4 mr-2" /> Run Payroll</>
          )}
        </Button>
      </div>
    </div>
  )
}
