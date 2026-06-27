'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LinkButton } from '@/components/ui/link-button'
import { Loader2, ArrowLeft, Building2 } from 'lucide-react'

const schema = z.object({
  employeeNumber: z.string().min(1, 'Required'),
  firstName:      z.string().min(1, 'First name is required'),
  secondName:     z.string().optional(),
  thirdName:      z.string().optional(),
  lastName:       z.string().min(1, 'Last name is required'),
  email:          z.string().email('Invalid email'),
  phone:          z.string().optional(),
  nationality:    z.string().optional(),
  country:        z.string().min(1, 'Required'),
  jobTitle:       z.string().optional(),
  employmentType: z.enum(['LOCAL', 'EXPATRIATE', 'CONTRACT', 'PART_TIME']),
  joinDate:       z.string().min(1, 'Required'),
  orgUnitId:      z.string().optional(),
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

interface NationalityOption { id: string; name: string }
interface JobTitleOption   { id: string; name: string }

interface OrgLevelOption {
  id: string
  name: string
  depth: number
  color: string | null
}

interface OrgUnitOption {
  id: string
  name: string
  parentId: string | null
  level: { name: string; depth: number; color: string | null }
  parent: { name: string } | null
}

export default function NewEmployeePage() {
  const router = useRouter()
  const t = useTranslations('employees')
  const tc = useTranslations('common')
  const [loading, setLoading] = useState(false)
  const [nationalities, setNationalities] = useState<NationalityOption[]>([])
  const [jobTitles,     setJobTitles]     = useState<JobTitleOption[]>([])
  const [orgUnits,      setOrgUnits]      = useState<OrgUnitOption[]>([])
  const [orgLevels,     setOrgLevels]     = useState<OrgLevelOption[]>([])
  const [selections,    setSelections]    = useState<Record<number, string>>({})

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { employmentType: 'LOCAL' },
  })

  /** Update selections at depth D and clear all deeper levels. */
  const handleLevelChange = useCallback((depth: number, unitId: string) => {
    setSelections((prev) => {
      const next: Record<number, string> = {}
      for (const [d, v] of Object.entries(prev)) {
        if (Number(d) < depth) next[Number(d)] = v
      }
      if (unitId && unitId !== 'none') next[depth] = unitId
      return next
    })
    setValue('orgUnitId', unitId && unitId !== 'none' ? unitId : '')
  }, [setValue])

  useEffect(() => {
    fetch('/api/nationalities?activeOnly=true')
      .then((r) => r.json())
      .then((json: { ok: boolean; data?: NationalityOption[] }) => {
        if (json.ok && json.data) setNationalities(json.data)
      })
      .catch(() => {/* silently ignore */})

    fetch('/api/job-titles')
      .then((r) => r.json())
      .then((json: { ok: boolean; data?: JobTitleOption[] }) => {
        if (json.ok && json.data) setJobTitles(json.data)
      })
      .catch(() => {/* silently ignore */})

    fetch('/api/org-units')
      .then((r) => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setOrgUnits(data as OrgUnitOption[])
      })
      .catch(() => {/* silently ignore */})

    fetch('/api/org-unit-levels')
      .then((r) => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setOrgLevels(data as OrgLevelOption[])
      })
      .catch(() => {/* silently ignore */})
  }, [])

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
          {tc('back')}
        </LinkButton>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('addTitle')}</h1>
          <p className="text-sm text-gray-500">{t('addDesc')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Information */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t('personalInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="First Name" error={errors.firstName?.message} required>
                <Input placeholder="Ahmed" {...register('firstName')} />
              </Field>
              <Field label="Last Name" error={errors.lastName?.message} required>
                <Input placeholder="Al-Rashidi" {...register('lastName')} />
              </Field>
              <Field label="Second Name" error={errors.secondName?.message}>
                <Input placeholder="Mohammed" {...register('secondName')} />
              </Field>
              <Field label="Third Name" error={errors.thirdName?.message}>
                <Input placeholder="Abdullah" {...register('thirdName')} />
              </Field>
              <Field label={t('employeeNumber')} error={errors.employeeNumber?.message} required>
                <Input placeholder="EMP-001" {...register('employeeNumber')} />
              </Field>
              <Field label={t('emailAddress')} error={errors.email?.message} required>
                <Input type="email" placeholder="ahmed@company.com" {...register('email')} />
              </Field>
              <Field label={t('phoneNumber')} error={errors.phone?.message}>
                <Input placeholder="+966 50 000 0000" {...register('phone')} />
              </Field>
              <Field label={t('nationality')} error={errors.nationality?.message}>
                <Select onValueChange={(v) => setValue('nationality', (v as string | null) ?? undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder={tc('select')} />
                  </SelectTrigger>
                  <SelectContent>
                    {nationalities.map((n) => (
                      <SelectItem key={n.id} value={n.name}>{n.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t('employmentDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('workCountry')} error={errors.country?.message} required>
                <Select onValueChange={(v) => { if (typeof v === 'string' && v) setValue('country', v) }}>
                  <SelectTrigger>
                    <SelectValue placeholder={tc('select')} />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t('employmentType')} error={errors.employmentType?.message} required>
                <Select
                  defaultValue="LOCAL"
                  onValueChange={(v) => { if (v) setValue('employmentType', v as FormData['employmentType']) }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOCAL">{t('local')}</SelectItem>
                    <SelectItem value="EXPATRIATE">{t('expatriate')}</SelectItem>
                    <SelectItem value="CONTRACT">{t('contract')}</SelectItem>
                    <SelectItem value="PART_TIME">{t('partTime')}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t('jobTitle')} error={errors.jobTitle?.message}>
                <Select onValueChange={(v) => setValue('jobTitle', (v as string | null) ?? undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder={tc('select')} />
                  </SelectTrigger>
                  <SelectContent>
                    {jobTitles.map((jt) => (
                      <SelectItem key={jt.id} value={jt.name}>{jt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t('joinDate')} error={errors.joinDate?.message} required>
                <Input type="date" {...register('joinDate')} />
              </Field>
            </div>

            {/* Dynamic cascading org-level dropdowns */}
            {orgLevels.length > 0 && (
              <div className="space-y-3 pt-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Company Structure
                </p>
                {orgLevels.map((level) => {
                  const available =
                    level.depth === 0
                      ? orgUnits.filter((u) => u.level.depth === 0)
                      : orgUnits.filter(
                          (u) =>
                            u.level.depth === level.depth &&
                            u.parentId === (selections[level.depth - 1] ?? null)
                        )
                  const parentSelected = level.depth === 0 || !!selections[level.depth - 1]
                  return (
                    <div key={level.id} className="space-y-1.5">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <Building2
                          className="w-3.5 h-3.5 shrink-0"
                          style={{ color: level.color ?? '#6b7280' }}
                        />
                        {level.name}
                      </Label>
                      <Select
                        key={`${level.depth}-${selections[level.depth - 1] ?? 'root'}-${orgUnits.length}`}
                        value={selections[level.depth] ?? ''}
                        onValueChange={(v) => handleLevelChange(level.depth, v ?? '')}
                        disabled={!parentSelected}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${level.name}`} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— None —</SelectItem>
                          {available.length === 0 ? (
                            <SelectItem value="" disabled>
                              {parentSelected
                                ? `No ${level.name.toLowerCase()} units found`
                                : `Select a ${orgLevels.find((l) => l.depth === level.depth - 1)?.name ?? 'parent'} first`}
                            </SelectItem>
                          ) : (
                            available.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <LinkButton variant="outline" href="/employees">{tc('cancel')}</LinkButton>
          <Button type="submit" disabled={loading} className="min-w-[140px]">
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('saving')}</>
            ) : (
              t('createEmployee')
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

interface FieldProps {
  readonly label: string
  readonly error?: string
  readonly required?: boolean
  readonly children: React.ReactNode
}

function Field({ label, error, required, children }: FieldProps) {
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
