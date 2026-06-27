'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Palette, Globe, Building2, Loader2 } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2),
  displayName: z.string().optional(),
  contactEmail: z.union([z.string().email(), z.literal('')]).optional(),
  website: z.union([z.string().url(), z.literal('')]).optional(),
  country: z.string().optional(),
  address: z.string().optional(),
  primaryColor: z.string().optional(),
  currency: z.string().optional(),
  dateFormat: z.string().optional(),
  payrollCycle: z.enum(['MONTHLY', 'BIWEEKLY', 'WEEKLY']).optional(),
})

type FormData = z.infer<typeof schema>

const COUNTRIES = [
  { code: 'SA', name: 'Saudi Arabia' }, { code: 'AE', name: 'UAE' },
  { code: 'KW', name: 'Kuwait' }, { code: 'QA', name: 'Qatar' },
  { code: 'BH', name: 'Bahrain' }, { code: 'OM', name: 'Oman' },
  { code: 'EG', name: 'Egypt' }, { code: 'MA', name: 'Morocco' },
  { code: 'TN', name: 'Tunisia' }, { code: 'DZ', name: 'Algeria' },
  { code: 'PH', name: 'Philippines' }, { code: 'IN', name: 'India' },
  { code: 'PK', name: 'Pakistan' }, { code: 'BD', name: 'Bangladesh' },
  { code: 'LK', name: 'Sri Lanka' }, { code: 'IT', name: 'Italy' },
]

const CURRENCIES = ['USD', 'EUR', 'SAR', 'AED', 'KWD', 'QAR', 'BHD', 'OMR',
  'EGP', 'MAD', 'TND', 'DZD', 'PHP', 'INR', 'PKR', 'BDT', 'LKR']

export default function BrandingPage() {
  const router = useRouter()
  const t = useTranslations('settings')
  const tc = useTranslations('common')
  const [saving, setSaving]   = useState(false)
  const [loading, setLoading] = useState(true)
  const [primaryColor, setPrimaryColor] = useState('#2563eb')

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { primaryColor: '#2563eb', payrollCycle: 'MONTHLY', dateFormat: 'DD/MM/YYYY' },
  })

  useEffect(() => {
    fetch('/api/settings/branding')
      .then(r => r.json())
      .then(({ org, branding }) => {
        if (org) {
          reset({
            name:         org.name          ?? '',
            displayName:  org.displayName   ?? '',
            contactEmail: org.contactEmail  ?? '',
            website:      org.website       ?? '',
            address:      org.address       ?? '',
            country:      org.country       ?? '',
            currency:     org.currency      ?? 'USD',
            payrollCycle: (org.payFrequency as FormData['payrollCycle']) ?? 'MONTHLY',
            dateFormat:   org.dateFormat    ?? 'DD/MM/YYYY',
            primaryColor: branding?.primaryColor ?? '#2563eb',
          })
          const color = branding?.primaryColor ?? '#2563eb'
          setPrimaryColor(color)
        }
      })
      .catch(() => { /* use defaults */ })
      .finally(() => setLoading(false))
  }, [reset])

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:         data.name,
          displayName:  data.displayName  || null,
          contactEmail: data.contactEmail || null,
          website:      data.website      || null,
          address:      data.address      || null,
          dateFormat:   data.dateFormat,
          country:      data.country      || null,
          currency:     data.currency,
          payFrequency: data.payrollCycle,
          primaryColor: data.primaryColor,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to save')
      toast.success(t('savedSuccess'))
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tc('error'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('brandingTitle')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('brandingDesc')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Organization Details */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-base">{t('orgDetails')}</CardTitle>
            </div>
            <CardDescription>{t('orgDetailsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t('orgNameRequired')}</Label>
                <Input {...register('name')} placeholder="Acme Corp" />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>{t('displayName')}</Label>
                <Input {...register('displayName')} placeholder="Acme" />
              </div>
              <div className="space-y-1.5">
                <Label>{t('contactEmail')}</Label>
                <Input {...register('contactEmail')} type="email" placeholder="hr@acme.com" />
                {errors.contactEmail && <p className="text-xs text-red-500">{errors.contactEmail.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>{t('website')}</Label>
                <Input {...register('website')} placeholder="https://acme.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('address')}</Label>
              <Textarea {...register('address')} placeholder="Street, City, Country" rows={2} className="resize-none" />
            </div>
          </CardContent>
        </Card>

        {/* Regional Settings */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-base">{t('regionalSettings')}</CardTitle>
            </div>
            <CardDescription>{t('regionalSettingsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>{tc('country')}</Label>
                <Select onValueChange={(v: string | null) => { if (v) setValue('country', v) }}>
                  <SelectTrigger><SelectValue placeholder={tc('selectCountry')} /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{tc('defaultCurrency')}</Label>
                <Select onValueChange={(v: string | null) => { if (v) setValue('currency', v) }}>
                  <SelectTrigger><SelectValue placeholder={tc('currency')} /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('payrollCycle')}</Label>
                <Select
                  defaultValue="MONTHLY"
                  onValueChange={(v) => { if (v) setValue('payrollCycle', v as 'MONTHLY' | 'BIWEEKLY' | 'WEEKLY') }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">{t('monthly')}</SelectItem>
                    <SelectItem value="BIWEEKLY">{t('biweekly')}</SelectItem>
                    <SelectItem value="WEEKLY">{t('weekly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('dateFormat')}</Label>
                <Select
                  defaultValue="DD/MM/YYYY"
                  onValueChange={(v) => { if (v) setValue('dateFormat', v) }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-base">{t('brandColors')}</CardTitle>
            </div>
            <CardDescription>{t('brandColorsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="space-y-1.5 flex-1">
                <Label>{t('primaryColor')}</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => {
                      setPrimaryColor(e.target.value)
                      setValue('primaryColor', e.target.value)
                    }}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => {
                      setPrimaryColor(e.target.value)
                      setValue('primaryColor', e.target.value)
                    }}
                    placeholder="#2563eb"
                    className="font-mono"
                  />
                </div>
              </div>
              <div
                className="w-20 h-20 rounded-xl border border-gray-100 shadow-sm flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                <span className="text-white text-xs font-bold">{t('preview')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="min-w-32">
            {saving ? tc('saving') : tc('saveChanges')}
          </Button>
        </div>
      </form>
    </div>
  )
}
