'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
import { Loader2, ArrowLeft, GitBranch, Building2 } from 'lucide-react'

const schema = z.object({
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
  managerId:      z.string().optional(),
  orgUnitId:      z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface EmployeeSummary {
  id: string
  fullName: string
  jobTitle: string | null
  employeeNumber: string
}

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

interface NationalityOption { id: string; name: string }
interface JobTitleOption   { id: string; name: string }

const COUNTRIES = [
  { code: 'SA', name: 'Saudi Arabia' }, { code: 'AE', name: 'UAE' },
  { code: 'KW', name: 'Kuwait' }, { code: 'BH', name: 'Bahrain' },
  { code: 'OM', name: 'Oman' }, { code: 'QA', name: 'Qatar' },
  { code: 'EG', name: 'Egypt' }, { code: 'MA', name: 'Morocco' },
  { code: 'TN', name: 'Tunisia' }, { code: 'IN', name: 'India' },
  { code: 'PH', name: 'Philippines' }, { code: 'IT', name: 'Italy' },
  { code: 'PK', name: 'Pakistan' }, { code: 'BD', name: 'Bangladesh' },
]

/** Walk up the parent chain to build depth→unitId selections for a given orgUnitId. */
function buildSelections(
  unitId: string,
  allUnits: OrgUnitOption[]
): Record<number, string> {
  const chain: Record<number, string> = {}
  let id: string | null = unitId
  while (id) {
    const u = allUnits.find((u) => u.id === id)
    if (!u) break
    chain[u.level.depth] = u.id
    id = u.parentId
  }
  return chain
}

export default function EditEmployeePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const t = useTranslations('employees')
  const tc = useTranslations('common')
  const [loading, setLoading]   = useState(false)
  const [fetching, setFetching] = useState(true)
  const [colleagues, setColleagues] = useState<EmployeeSummary[]>([])
  const [orgUnits,   setOrgUnits]   = useState<OrgUnitOption[]>([])
  const [orgLevels,  setOrgLevels]  = useState<OrgLevelOption[]>([])
  const [selections, setSelections] = useState<Record<number, string>>({})
  const [nationalities, setNationalities] = useState<NationalityOption[]>([])
  const [jobTitles,     setJobTitles]     = useState<JobTitleOption[]>([])

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
  })

  const selectedManagerId      = watch('managerId')
  const selectedCountry        = watch('country')
  const selectedEmploymentType = watch('employmentType')

  /** Update selections at a given depth and clear all deeper levels. */
  const handleLevelChange = useCallback((depth: number, unitId: string) => {
    setSelections((prev) => {
      const next: Record<number, string> = {}
      for (const [d, v] of Object.entries(prev)) {
        if (Number(d) < depth) next[Number(d)] = v
      }
      if (unitId && unitId !== 'none') next[depth] = unitId
      return next
    })
    // The deepest selection becomes orgUnitId
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
  }, [])

  useEffect(() => {
    Promise.all([
      fetch(`/api/employees/${params.id}`).then((r) => r.json()),
      fetch('/api/employees?limit=200').then((r) => r.json()),
      fetch('/api/org-units').then((r) => r.json()),
      fetch('/api/org-unit-levels').then((r) => r.json()),
    ]).then(([empData, allData, unitsData, levelsData]) => {
      const units: OrgUnitOption[] = Array.isArray(unitsData) ? unitsData : []
      const levels: OrgLevelOption[] = Array.isArray(levelsData) ? levelsData : []
      setOrgUnits(units)
      setOrgLevels(levels)

      if (empData.data?.employee) {
        const e = empData.data.employee
        reset({
          firstName:      e.firstName      ?? '',
          secondName:     e.secondName     ?? '',
          thirdName:      e.thirdName      ?? '',
          lastName:       e.lastName       ?? '',
          email:          e.email,
          phone:          e.phone          ?? '',
          nationality:    e.nationality    ?? '',
          country:        e.country,
          jobTitle:       e.jobTitle       ?? '',
          employmentType: e.employmentType,
          managerId:      e.managerId      ?? '',
          orgUnitId:      e.orgUnitId      ?? '',
        })
        // Pre-populate cascading selections from the employee's existing orgUnitId
        if (e.orgUnitId) {
          setSelections(buildSelections(e.orgUnitId, units))
        }
      }
      const others: EmployeeSummary[] = (allData?.data?.data ?? []).filter(
        (c: EmployeeSummary) => c.id !== params.id
      )
      setColleagues(others)
    }).finally(() => setFetching(false))
  }, [params.id, reset])

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const payload = {
        ...data,
        managerId: data.managerId && data.managerId !== 'none' ? data.managerId : null,
        orgUnitId: data.orgUnitId && data.orgUnitId !== 'none' ? data.orgUnitId : null,
      }
      const res = await fetch(`/api/employees/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to update employee')
        return
      }
      toast.success('Employee updated successfully')
      router.push(`/employees/${params.id}/personal`)
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <LinkButton variant="ghost" href={`/employees/${params.id}/personal`} size="sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> {tc('back')}
        </LinkButton>
        <h1 className="text-2xl font-bold text-gray-900">{t('editEmployee')}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">{t('personalInfo')}</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input {...register('firstName')} />
                {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Last Name *</Label>
                <Input {...register('lastName')} />
                {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Second Name</Label>
                <Input {...register('secondName')} />
              </div>
              <div className="space-y-1.5">
                <Label>Third Name</Label>
                <Input {...register('thirdName')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t('emailAddress')} *</Label>
                <Input type="email" {...register('email')} />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>{t('phoneNumber')}</Label>
                <Input {...register('phone')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t('nationality')}</Label>
                <Select
                  value={watch('nationality') ?? ''}
                  onValueChange={(v) => setValue('nationality', v ?? '')}
                >
                  <SelectTrigger><SelectValue placeholder={tc('select')} /></SelectTrigger>
                  <SelectContent>
                    {nationalities.map((n) => (
                      <SelectItem key={n.id} value={n.name}>{n.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t('jobTitle')}</Label>
                <Select
                  value={watch('jobTitle') ?? ''}
                  onValueChange={(v) => setValue('jobTitle', v ?? '')}
                >
                  <SelectTrigger><SelectValue placeholder={tc('select')} /></SelectTrigger>
                  <SelectContent>
                    {jobTitles.map((jt) => (
                      <SelectItem key={jt.id} value={jt.name}>{jt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('workCountry')} *</Label>
                <Select value={selectedCountry ?? ''} onValueChange={(v) => { if (v) setValue('country', v) }}>
                  <SelectTrigger><SelectValue placeholder={tc('selectCountry')} /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.country && <p className="text-xs text-red-500">{errors.country.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t('employmentType')} *</Label>
                <Select value={selectedEmploymentType ?? ''} onValueChange={(v) => { if (v) setValue('employmentType', v as FormData['employmentType']) }}>
                  <SelectTrigger><SelectValue placeholder={tc('select')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOCAL">{t('local')}</SelectItem>
                    <SelectItem value="EXPATRIATE">{t('expatriate')}</SelectItem>
                    <SelectItem value="CONTRACT">{t('contract')}</SelectItem>
                    <SelectItem value="PART_TIME">{t('partTime')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Direct Manager */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-gray-400" />
                {t('directManager')}
                <span className="text-gray-400 text-xs font-normal">{t('orgChartNote')}</span>
              </Label>
              <Select
                key={`manager-${colleagues.length}`}
                value={selectedManagerId ?? ''}
                onValueChange={(v) => setValue('managerId', (!v || v === 'none') ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('noManager')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— {t('noManager')} —</SelectItem>
                  {colleagues.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName}
                      {c.jobTitle ? ` · ${c.jobTitle}` : ''}
                      {` (#${c.employeeNumber})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                      <Label className="flex items-center gap-1.5">
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

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {tc('saveChanges')}
          </Button>
          <LinkButton variant="outline" href={`/employees/${params.id}/personal`}>{tc('cancel')}</LinkButton>
        </div>
      </form>
    </div>
  )
}
