'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Palette, Globe, Building2 } from 'lucide-react'

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
  const [saving, setSaving] = useState(false)
  const [primaryColor, setPrimaryColor] = useState('#2563eb')

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { primaryColor: '#2563eb', payrollCycle: 'MONTHLY', dateFormat: 'DD/MM/YYYY' },
  })

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/tenants/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Branding settings saved successfully')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tenant Branding & Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Customize your organization&apos;s appearance and regional preferences</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Organization Details */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-base">Organization Details</CardTitle>
            </div>
            <CardDescription>Core information about your organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Organization Name *</Label>
                <Input {...register('name')} placeholder="Acme Corp" />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Display Name</Label>
                <Input {...register('displayName')} placeholder="Acme" />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Email</Label>
                <Input {...register('contactEmail')} type="email" placeholder="hr@acme.com" />
                {errors.contactEmail && <p className="text-xs text-red-500">{errors.contactEmail.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input {...register('website')} placeholder="https://acme.com" />
              </div>
            </div>
            <div className="space-y-1.5">
                <Label>Address</Label>
                <Input {...register('address')} placeholder="Street, City, Country" />
              </div>
          </CardContent>
        </Card>

        {/* Regional Settings */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-base">Regional Settings</CardTitle>
            </div>
            <CardDescription>Configure locale, currency, and payroll cycle</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Select onValueChange={(v: string | null) => { if (v) setValue('country', v) }}>
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Default Currency</Label>
                <Select onValueChange={(v: string | null) => { if (v) setValue('currency', v) }}>
                  <SelectTrigger><SelectValue placeholder="Currency" /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Payroll Cycle</Label>
                <Select
                  defaultValue="MONTHLY"
                  onValueChange={(v) => { if (v) setValue('payrollCycle', v as 'MONTHLY' | 'BIWEEKLY' | 'WEEKLY') }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="BIWEEKLY">Bi-Weekly</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date Format</Label>
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
              <CardTitle className="text-base">Brand Colors</CardTitle>
            </div>
            <CardDescription>Customize the look and feel of your tenant portal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="space-y-1.5 flex-1">
                <Label>Primary Color</Label>
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
                <span className="text-white text-xs font-bold">Preview</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="min-w-32">
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
