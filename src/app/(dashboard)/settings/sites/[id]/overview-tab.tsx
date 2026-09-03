'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Pencil, CalendarClock } from 'lucide-react'
import type { SiteDetail } from './types'

const FREQUENCY_OPTIONS = [
  { value: 6,  label: '6 months' },
  { value: 12, label: '12 months (annual)' },
  { value: 24, label: '24 months (biennial)' },
]

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}

interface OverviewTabProps {
  site:     SiteDetail
  onSaved:  () => void
}

interface FormState {
  name:             string
  legalEntityName:  string
  vatNumber:        string
  taxCode:          string
  atecoCode:        string
  atecoDescription: string
  address:          string
  city:             string
  country:          string
  workingHours:     string
  shiftPattern:     string
}

function toFormState(site: SiteDetail): FormState {
  return {
    name:             site.name,
    legalEntityName:  site.legalEntityName ?? '',
    vatNumber:        site.vatNumber ?? '',
    taxCode:          site.taxCode ?? '',
    atecoCode:        site.atecoCode ?? '',
    atecoDescription: site.atecoDescription ?? '',
    address:          site.address ?? '',
    city:             site.city ?? '',
    country:          site.country ?? '',
    workingHours:     site.workingHours ?? '',
    shiftPattern:     site.shiftPattern ?? '',
  }
}

interface ReviewScheduleForm {
  nextReviewDate:        string
  reviewFrequencyMonths: number
}

function toReviewForm(dvr: SiteDetail['dvr']): ReviewScheduleForm {
  return {
    nextReviewDate:        dvr?.nextReviewDate ? dvr.nextReviewDate.slice(0, 10) : '',
    reviewFrequencyMonths: dvr?.reviewFrequencyMonths ?? 12,
  }
}

export function OverviewTab({ site, onSaved }: OverviewTabProps) {
  const t = useTranslations('sites')
  const [editing, setEditing]           = useState(false)
  const [form, setForm]                 = useState<FormState>(toFormState(site))
  const [saving, setSaving]             = useState(false)
  const [reviewForm, setReviewForm]     = useState<ReviewScheduleForm>(toReviewForm(site.dvr))
  const [savingReview, setSavingReview] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function startEdit() {
    setForm(toFormState(site))
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res  = await fetch(`/api/sites/${site.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const json = await res.json() as { ok: boolean; message?: string }
      if (json.ok) {
        toast.success(t('saved'))
        setEditing(false)
        onSaved()
      } else {
        toast.error(json.message ?? t('errorSaving'))
      }
    } catch {
      toast.error(t('errorSaving'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveReviewSchedule() {
    if (!site.dvr) return
    setSavingReview(true)
    try {
      const body: Record<string, unknown> = {
        reviewFrequencyMonths: reviewForm.reviewFrequencyMonths,
      }
      if (reviewForm.nextReviewDate) {
        body['nextReviewDate'] = new Date(reviewForm.nextReviewDate).toISOString()
      }
      const res  = await fetch(`/api/sites/${site.id}/dvr`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const json = await res.json() as { ok: boolean; message?: string }
      if (json.ok) {
        toast.success(t('dvr.reviewScheduleSaved'))
        onSaved()
      } else {
        toast.error(json.message ?? t('errorSaving'))
      }
    } catch {
      toast.error(t('errorSaving'))
    } finally {
      setSavingReview(false)
    }
  }

  if (editing) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">{t('editSite')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ov-name">{t('siteName')} *</Label>
              <Input id="ov-name" name="name" value={form.name} onChange={handleChange} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ov-legal">{t('legalEntityName')}</Label>
              <Input id="ov-legal" name="legalEntityName" value={form.legalEntityName} onChange={handleChange} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ov-vat">{t('vatNumber')}</Label>
              <Input id="ov-vat" name="vatNumber" value={form.vatNumber} onChange={handleChange} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ov-tax">{t('taxCode')}</Label>
              <Input id="ov-tax" name="taxCode" value={form.taxCode} onChange={handleChange} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ov-ateco">{t('atecoCode')}</Label>
              <Input id="ov-ateco" name="atecoCode" value={form.atecoCode} onChange={handleChange} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ov-atecoDesc">{t('atecoDescription')}</Label>
              <Input id="ov-atecoDesc" name="atecoDescription" value={form.atecoDescription} onChange={handleChange} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="ov-address">{t('address')}</Label>
              <Input id="ov-address" name="address" value={form.address} onChange={handleChange} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ov-city">{t('city')}</Label>
              <Input id="ov-city" name="city" value={form.city} onChange={handleChange} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ov-country">{t('country')}</Label>
              <Input id="ov-country" name="country" value={form.country} onChange={handleChange} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ov-hours">{t('workingHours')}</Label>
              <Input id="ov-hours" name="workingHours" value={form.workingHours} onChange={handleChange} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ov-shift">{t('shiftPattern')}</Label>
              <Input id="ov-shift" name="shiftPattern" value={form.shiftPattern} onChange={handleChange} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>{t('cancel')}</Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const freqLabel = FREQUENCY_OPTIONS.find((o) => o.value === (site.dvr?.reviewFrequencyMonths ?? 12))?.label ?? '12 months (annual)'
  const nextReviewDisplay = site.dvr?.nextReviewDate
    ? new Date(site.dvr.nextReviewDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t('siteInformation')}</CardTitle>
          <Button size="sm" variant="outline" onClick={startEdit} className="flex items-center gap-1.5">
            <Pencil className="w-3.5 h-3.5" />
            {t('edit')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-1">
          <Row label={t('legalEntityName')} value={site.legalEntityName ?? '—'} />
          <Row label={t('vatNumber')} value={site.vatNumber ?? '—'} />
          <Row label={t('taxCode')} value={site.taxCode ?? '—'} />
          <Row label={t('atecoCode')} value={site.atecoCode ?? '—'} />
          <Row label={t('atecoDescription')} value={site.atecoDescription ?? '—'} />
          <Row label={t('address')} value={site.address ?? '—'} />
          <Row label={t('city')} value={site.city ?? '—'} />
          <Row label={t('country')} value={site.country ?? '—'} />
          <Row label={t('workingHours')} value={site.workingHours ?? '—'} />
          <Row label={t('shiftPattern')} value={site.shiftPattern ?? '—'} />
        </CardContent>
      </Card>

      {site.dvr && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-blue-600" />
              {t('dvr.reviewSchedule')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-0.5">{t('dvr.nextReviewDate')}</p>
                <p className="font-medium">{nextReviewDisplay}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-0.5">{t('dvr.reviewFrequency')}</p>
                <p className="font-medium">{freqLabel}</p>
              </div>
            </div>

            <div className="border-t pt-4 grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rs-date">{t('dvr.nextReviewDate')}</Label>
                <Input
                  id="rs-date"
                  type="date"
                  value={reviewForm.nextReviewDate}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, nextReviewDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rs-freq">{t('dvr.reviewFrequency')}</Label>
                <select
                  id="rs-freq"
                  value={reviewForm.reviewFrequencyMonths}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, reviewFrequencyMonths: Number.parseInt(e.target.value, 10) }))}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {FREQUENCY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => void handleSaveReviewSchedule()} disabled={savingReview}>
                {savingReview && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('save')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
