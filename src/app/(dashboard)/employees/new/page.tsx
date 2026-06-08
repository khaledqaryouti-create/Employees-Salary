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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LinkButton } from '@/components/ui/link-button'
import { Loader2, ArrowLeft } from 'lucide-react'

const schema = z.object({
  employeeNumber: z.string().min(1, 'Required'),
  fullName: z.string().min(2, 'At least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  nationality: z.string().optional(),
  country: z.string().min(1, 'Required'),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
  employmentType: z.enum(['LOCAL', 'EXPATRIATE', 'CONTRACT', 'PART_TIME']),
  joinDate: z.string().min(1, 'Required'),
  basicSalary: z.coerce.number().positive('Must be positive'),
  currency: z.string().min(1, 'Required'),
})

type FormData = z.infer<typeof schema>

const COUNTRIES = [
  { value: 'SA', label: 'Saudi Arabia' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'KW', label: 'Kuwait' },
  { value: 'BH', label: 'Bahrain' },
  { value: 'QA', label: 'Qatar' },
  { value: 'OM', label: 'Oman' },
  { value: 'IN', label: 'India' },
  { value: 'PH', label: 'Philippines' },
  { value: 'SG', label: 'Singapore' },
  { value: 'MY', label: 'Malaysia' },
  { value: 'ID', label: 'Indonesia' },
  { value: 'JP', label: 'Japan' },
  { value: 'CN', label: 'China' },
  { value: 'EG', label: 'Egypt' },
  { value: 'MA', label: 'Morocco' },
  { value: 'TN', label: 'Tunisia' },
  { value: 'LY', label: 'Libya' },
  { value: 'IT', label: 'Italy' },
]

const CURRENCIES = [
  { value: 'SAR', label: 'SAR — Saudi Riyal' },
  { value: 'AED', label: 'AED — UAE Dirham' },
  { value: 'KWD', label: 'KWD — Kuwaiti Dinar' },
  { value: 'BHD', label: 'BHD — Bahraini Dinar' },
  { value: 'QAR', label: 'QAR — Qatari Riyal' },
  { value: 'OMR', label: 'OMR — Omani Rial' },
  { value: 'INR', label: 'INR — Indian Rupee' },
  { value: 'PHP', label: 'PHP — Philippine Peso' },
  { value: 'SGD', label: 'SGD — Singapore Dollar' },
  { value: 'MYR', label: 'MYR — Malaysian Ringgit' },
  { value: 'IDR', label: 'IDR — Indonesian Rupiah' },
  { value: 'JPY', label: 'JPY — Japanese Yen' },
  { value: 'CNY', label: 'CNY — Chinese Yuan' },
  { value: 'EGP', label: 'EGP — Egyptian Pound' },
  { value: 'MAD', label: 'MAD — Moroccan Dirham' },
  { value: 'TND', label: 'TND — Tunisian Dinar' },
  { value: 'LYD', label: 'LYD — Libyan Dinar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'USD', label: 'USD — US Dollar' },
]

export default function NewEmployeePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { employmentType: 'LOCAL', currency: 'USD' },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json() as { ok: boolean; message?: string; data?: { id: string } }

      if (!json.ok) {
        toast.error(json.message ?? 'Failed to create employee')
        return
      }

      toast.success('Employee created successfully')
      router.push('/employees')
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <LinkButton variant="ghost" href="/employees" size="sm">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </LinkButton>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Employee</h1>
          <p className="text-sm text-gray-500">Fill in the employee details below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Information */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name" error={errors.fullName?.message} required>
                <Input placeholder="Ahmed Al-Rashidi" {...register('fullName')} />
              </Field>
              <Field label="Employee Number" error={errors.employeeNumber?.message} required>
                <Input placeholder="EMP-001" {...register('employeeNumber')} />
              </Field>
              <Field label="Email Address" error={errors.email?.message} required>
                <Input type="email" placeholder="ahmed@company.com" {...register('email')} />
              </Field>
              <Field label="Phone Number" error={errors.phone?.message}>
                <Input placeholder="+966 50 000 0000" {...register('phone')} />
              </Field>
              <Field label="Nationality" error={errors.nationality?.message}>
                <Input placeholder="Saudi Arabian" {...register('nationality')} />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Country" error={errors.country?.message} required>
                <Select onValueChange={(v) => { if (typeof v === 'string' && v) setValue('country', v) }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Employment Type" error={errors.employmentType?.message} required>
                <Select
                  defaultValue="LOCAL"
                  onValueChange={(v) => { if (v) setValue('employmentType', v as FormData['employmentType']) }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOCAL">Local</SelectItem>
                    <SelectItem value="EXPATRIATE">Expatriate</SelectItem>
                    <SelectItem value="CONTRACT">Contract</SelectItem>
                    <SelectItem value="PART_TIME">Part Time</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Department" error={errors.department?.message}>
                <Input placeholder="Finance" {...register('department')} />
              </Field>
              <Field label="Job Title" error={errors.jobTitle?.message}>
                <Input placeholder="Accountant" {...register('jobTitle')} />
              </Field>
              <Field label="Join Date" error={errors.joinDate?.message} required>
                <Input type="date" {...register('joinDate')} />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Salary */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Basic Salary</CardTitle>
            <CardDescription>Additional allowances can be added after creating the employee</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Basic Salary" error={errors.basicSalary?.message} required>
                <Input
                  type="number"
                  placeholder="5000"
                  step="0.01"
                  min="0"
                  {...register('basicSalary')}
                />
              </Field>
              <Field label="Currency" error={errors.currency?.message} required>
                <Select defaultValue="USD" onValueChange={(v) => { if (v) setValue('currency', v) }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <LinkButton variant="outline" href="/employees">Cancel</LinkButton>
          <Button type="submit" disabled={loading} className="min-w-[140px]">
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
            ) : (
              'Create Employee'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
