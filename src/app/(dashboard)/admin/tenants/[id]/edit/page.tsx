'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { LinkButton } from '@/components/ui/link-button'
import { Loader2, ArrowLeft } from 'lucide-react'

const schema = z.object({
  name:        z.string().min(2, 'At least 2 characters'),
  country:     z.string().min(1, 'Required'),
  currency:    z.string().min(1, 'Required'),
  payFrequency: z.enum(['MONTHLY', 'BIWEEKLY', 'WEEKLY']),
  isActive:    z.boolean(),
  primaryColor: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const COUNTRIES = [
  { code: 'SA', name: 'Saudi Arabia' }, { code: 'AE', name: 'UAE' },
  { code: 'KW', name: 'Kuwait' }, { code: 'BH', name: 'Bahrain' },
  { code: 'OM', name: 'Oman' }, { code: 'QA', name: 'Qatar' },
  { code: 'EG', name: 'Egypt' }, { code: 'MA', name: 'Morocco' },
  { code: 'TN', name: 'Tunisia' }, { code: 'IN', name: 'India' },
  { code: 'PH', name: 'Philippines' }, { code: 'IT', name: 'Italy' },
]

export default function EditTenantPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { isActive: true, payFrequency: 'MONTHLY' },
  })

  const isActive = watch('isActive')

  useEffect(() => {
    fetch(`/api/admin/tenants/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.organization) {
          const o = data.organization
          reset({
            name: o.name,
            country: o.country ?? 'SA',
            currency: o.currency ?? 'USD',
            payFrequency: o.payFrequency ?? 'MONTHLY',
            isActive: o.isActive,
            primaryColor: o.branding?.primaryColor ?? '',
          })
        }
      })
      .finally(() => setFetching(false))
  }, [params.id, reset])

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/tenants/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to update tenant')
        return
      }
      toast.success('Tenant updated successfully')
      router.push(`/admin/tenants/${params.id}`)
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <LinkButton variant="ghost" href={`/admin/tenants/${params.id}`} size="sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </LinkButton>
        <h1 className="text-2xl font-bold text-gray-900">Edit Tenant</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Organization Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Organization Name *</Label>
              <Input {...register('name')} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Primary Country *</Label>
                <Select onValueChange={(v) => { if (v) setValue('country', v as string) }}>
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Currency *</Label>
                <Select onValueChange={(v) => { if (v) setValue('currency', v as string) }}>
                  <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                  <SelectContent>
                    {['SAR','AED','KWD','BHD','OMR','QAR','EGP','MAD','TND','INR','PHP','EUR','USD'].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Pay Frequency</Label>
                <Select onValueChange={(v) => { if (v) setValue('payFrequency', v as FormData['payFrequency']) }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Brand Color</Label>
                <Input type="color" {...register('primaryColor')} className="h-10 cursor-pointer" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={isActive}
                onCheckedChange={(v) => setValue('isActive', v)}
              />
              <Label>{isActive ? 'Active' : 'Suspended'}</Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
          <LinkButton variant="outline" href={`/admin/tenants/${params.id}`}>Cancel</LinkButton>
        </div>
      </form>
    </div>
  )
}
