'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LinkButton } from '@/components/ui/link-button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2, ArrowLeft, AlertCircle, PlayCircle, RefreshCw } from 'lucide-react'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function NewPayrollRunPage() {
  const router = useRouter()
  const t = useTranslations('payroll')
  const tc = useTranslations('common')
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [loading, setLoading] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [showOverrideDialog, setShowOverrideDialog] = useState(false)
  const [conflictStatus, setConflictStatus] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  function buildPayload(force?: boolean) {
    return {
      name: name || `Payroll - ${MONTHS[Number.parseInt(month) - 1]} ${year}`,
      periodMonth: Number.parseInt(month),
      periodYear:  Number.parseInt(year),
      currency,
      ...(force ? { force: true } : {}),
    }
  }

  async function submitRun(force?: boolean) {
    setLoading(true)
    setRunError(null)
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(force)),
      })

      const json = await res.json() as {
        ok: boolean
        code?: string
        existingStatus?: string
        message?: string
        data?: { id: string }
      }

      if (res.status === 409 && json.code === 'CONFLICT' && json.existingStatus) {
        setConflictStatus(json.existingStatus)
        setShowOverrideDialog(true)
        return
      }

      if (!json.ok) {
        setRunError(json.message ?? 'Failed to start payroll run')
        return
      }

      toast.success(t('runStarted'))
      router.push(`/payroll/${json.data?.id}`)
    } catch {
      setRunError(t('networkError'))
    } finally {
      setLoading(false)
    }
  }

  function handleRun() { return submitRun() }

  async function handleForceRun() {
    setShowOverrideDialog(false)
    await submitRun(true)
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <LinkButton variant="ghost" href="/payroll" size="sm">
          <ArrowLeft className="w-4 h-4 mr-1" />
          {tc('back')}
        </LinkButton>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('newRunTitle')}</h1>
          <p className="text-sm text-gray-500">{t('newRunDesc')}</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t('payrollPeriod')}</CardTitle>
          <CardDescription>
            {t('payrollPeriodDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">{t('runNameOptional')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('runNamePlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">{t('month')} <span className="text-red-500">*</span></Label>
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
              <Label className="text-sm">{t('year')} <span className="text-red-500">*</span></Label>
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
            <Label className="text-sm">{t('baseCurrency')}</Label>
            <Select value={currency} onValueChange={(v) => { if (v) setCurrency(v) }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
                <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
                <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
                <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                <SelectItem value="EGP">EGP - Egyptian Pound</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {runError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">{t('runFailed')}</p>
            <p className="text-sm text-red-600 mt-0.5">{runError}</p>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-medium">{t('whatHappens')}</p>
        <ul className="mt-2 space-y-1 text-blue-700 list-disc list-inside">
          <li>{t('whatHappensBullet1')}</li>
          <li>{t('whatHappensBullet2')}</li>
          <li>{t('whatHappensBullet3')}</li>
          <li>{t('whatHappensBullet4')}</li>
        </ul>
      </div>

      <div className="flex items-center justify-end gap-3">
        <LinkButton variant="outline" href="/payroll">{tc('cancel')}</LinkButton>
        <Button onClick={handleRun} disabled={loading} className="min-w-[160px]">
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('processing')}</>
          ) : (
            <><PlayCircle className="w-4 h-4 mr-2" /> {t('runPayrollBtn')}</>
          )}
        </Button>
      </div>

      {/* Override confirmation dialog */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payroll Run Already Exists</DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              <span className="block">
                A payroll run for this period already exists
                {conflictStatus && (
                  <span className="ml-1 font-semibold text-orange-600">({conflictStatus})</span>
                )}.
              </span>
              <span className="block">
                Recalculating salaries will <strong>override the current payroll</strong> data and
                replace all existing payroll items for this period. This action cannot be undone.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowOverrideDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleForceRun}
              disabled={loading}
              className="min-w-[180px]"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Recalculating...</>
              ) : (
                <><RefreshCw className="w-4 h-4 mr-2" /> Recalculate &amp; Override</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
