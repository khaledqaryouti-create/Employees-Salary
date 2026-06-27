'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LinkButton } from '@/components/ui/link-button'
import { Loader2, ArrowLeft } from 'lucide-react'

interface LeaveType {
  id: string
  name: string
  maxDaysPerYear: number | null
  color: string | null
}

export default function NewLeaveRequestPage() {
  const router = useRouter()
  const t = useTranslations('leave')
  const tc = useTranslations('common')
  const [loading, setLoading] = useState(false)
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [leaveTypeId, setLeaveTypeId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/leave/types')
      .then((r) => r.json())
      .then((j: { ok: boolean; data?: LeaveType[] }) => {
        if (j.ok && j.data) setLeaveTypes(j.data)
      })
      .catch(() => {})
  }, [])

  const daysDiff = startDate && endDate
    ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0

  function validate() {
    const e: Record<string, string> = {}
    if (!leaveTypeId) e['leaveTypeId'] = 'Please select a leave type'
    if (!startDate) e['startDate'] = 'Start date is required'
    if (!endDate) e['endDate'] = 'End date is required'
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      e['endDate'] = 'End date must be after start date'
    }
    return e
  }

  async function handleSubmit() {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length > 0) return

    setLoading(true)
    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaveTypeId, startDate, endDate, reason }),
      })
      const json = await res.json() as { ok: boolean; message?: string }

      if (!json.ok) {
        toast.error(json.message ?? 'Failed to submit leave request')
        return
      }

      toast.success(t('submitted'))
      router.push('/leave')
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <LinkButton variant="ghost" href="/leave" size="sm">
          <ArrowLeft className="w-4 h-4 mr-1" />
          {tc('back')}
        </LinkButton>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('requestTitle')}</h1>
          <p className="text-sm text-gray-500">{t('requestDesc')}</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t('leaveDetails')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">{t('leaveType')} <span className="text-red-500">*</span></Label>
            <Select onValueChange={(v) => { if (typeof v === 'string' && v) setLeaveTypeId(v) }}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectLeaveType')} />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map((lt) => (
                  <SelectItem key={lt.id} value={lt.id}>
                    {lt.name}
                    {lt.maxDaysPerYear && ` (${t('maxDaysPerYear', { days: lt.maxDaysPerYear })})`}
                  </SelectItem>
                ))}
                {leaveTypes.length === 0 && (
                  <SelectItem value="_none" disabled>{t('noLeaveTypes')}</SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors['leaveTypeId'] && <p className="text-xs text-red-500">{errors['leaveTypeId']}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">{t('from')} <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={startDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  if (!endDate || endDate < e.target.value) setEndDate(e.target.value)
                }}
              />
              {errors['startDate'] && <p className="text-xs text-red-500">{errors['startDate']}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{t('to')} <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={endDate}
                min={startDate || new Date().toISOString().split('T')[0]}
                onChange={(e) => setEndDate(e.target.value)}
              />
              {errors['endDate'] && <p className="text-xs text-red-500">{errors['endDate']}</p>}
            </div>
          </div>

          {daysDiff > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-sm text-blue-700">
              {daysDiff} {daysDiff === 1 ? t('calendarDay') : t('calendarDays')}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm">{t('reasonOptional')}</Label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none"
              placeholder={t('reasonPlaceholder')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <LinkButton variant="outline" href="/leave">{tc('cancel')}</LinkButton>
        <Button onClick={handleSubmit} disabled={loading} className="min-w-[160px]">
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('submitting')}</>
          ) : (
            t('submitRequest')
          )}
        </Button>
      </div>
    </div>
  )
}
