'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LinkButton } from '@/components/ui/link-button'
import { Loader2, ArrowLeft } from 'lucide-react'

const schema = z.object({
  name:          z.string().min(2, 'At least 2 characters'),
  country:       z.string().min(1, 'Required'),
  year:          z.coerce.number().int().min(2020).max(2030),
  description:   z.string().optional(),
})
type FormData = z.infer<typeof schema>

const COUNTRIES = [
  { code: 'SA', name: 'Saudi Arabia' }, { code: 'AE', name: 'UAE' },
  { code: 'KW', name: 'Kuwait' }, { code: 'BH', name: 'Bahrain' },
  { code: 'OM', name: 'Oman' }, { code: 'QA', name: 'Qatar' },
  { code: 'EG', name: 'Egypt' }, { code: 'MA', name: 'Morocco' },
  { code: 'TN', name: 'Tunisia' }, { code: 'IN', name: 'India' },
  { code: 'PH', name: 'Philippines' }, { code: 'IT', name: 'Italy' },
  { code: 'PK', name: 'Pakistan' }, { code: 'BD', name: 'Bangladesh' },
]

export default function NewFormulaRuleSetPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { year: new Date().getFullYear() },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const res = await fetch('/api/formula/rule-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to create rule set')
        return
      }
      const result = await res.json()
      toast.success('Rule set created!')
      router.push(`/settings/formula-builder/${result.data.ruleSet.id}`)
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-4">
        <LinkButton variant="ghost" href="/settings/formula-builder" size="sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </LinkButton>
        <h1 className="text-2xl font-bold text-gray-900">New Rule Set</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Rule Set Details</CardTitle>
            <CardDescription>
              Create a custom payroll rule set for a specific country and year.
              You can add individual rules (earnings, deductions, taxes) after creation.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input placeholder="e.g. Saudi Arabia GOSI Rules 2026" {...register('name')} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Country *</Label>
                <Select onValueChange={(v) => { if (v) setValue('country', v as string) }}>
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.country && <p className="text-xs text-red-500">{errors.country.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Year *</Label>
                <Input type="number" min={2020} max={2030} {...register('year')} />
                {errors.year && <p className="text-xs text-red-500">{errors.year.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="Optional description..." rows={3} {...register('description')} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Rule Set
          </Button>
          <LinkButton variant="outline" href="/settings/formula-builder">Cancel</LinkButton>
        </div>
      </form>
    </div>
  )
}
