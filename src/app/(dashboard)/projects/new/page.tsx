'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, FolderKanban, ShieldCheck } from 'lucide-react'

interface Country  { id: string; code: string; name: string }
interface Employee { id: string; fullName: string; employeeCode: string }

const PROJECT_TYPES = [
  'FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE', 'ELECTRICAL_INFRASTRUCTURE', 'DATA_CENTER', 'OTHER',
] as const

export default function NewProjectPage() {
  const t      = useTranslations('projects')
  const router = useRouter()
  const [loading, setLoading]     = useState(false)
  const [countries, setCountries] = useState<Country[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [form, setForm] = useState({
    code:                  '',
    name:                  '',
    description:           '',
    clientName:            '',
    status:                'PLANNING',
    startDate:             '',
    endDate:               '',
    budgetAmount:          '',
    currency:              'USD',
    costCenter:            '',
    billable:              true,
    allocationMode:        'PERCENTAGE',
    overheadFormula:       '',
    managerId:             '',
    countryId:             '',
    projectType:           '',
    buildingHeightMeters:  '',
    hasElectricalWorks:    false,
    hasMultipleContractors: false,
    occupancyType:         '',
  })

  useEffect(() => {
    void (async () => {
      try {
        const [countryRes, empRes] = await Promise.all([
          fetch('/api/countries'),
          fetch('/api/employees?limit=200'),
        ])
        const countryJson = await countryRes.json() as { ok: boolean; data: Country[] }
        const empJson     = await empRes.json()    as { ok: boolean; data: { data: Employee[] } }
        if (countryJson.ok) setCountries(countryJson.data)
        if (empJson.ok)     setEmployees(empJson.data.data ?? [])
      } catch { /* silent */ }
    })()
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res  = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          budgetAmount:         form.budgetAmount ? Number(form.budgetAmount) : undefined,
          endDate:              form.endDate || undefined,
          projectType:          form.projectType || undefined,
          countryId:            form.countryId || undefined,
          buildingHeightMeters: form.buildingHeightMeters ? Number(form.buildingHeightMeters) : undefined,
          occupancyType:        form.occupancyType || undefined,
          managerId:            form.managerId || undefined,
        }),
      })
      const json = await res.json() as { ok: boolean; data: { id: string }; message?: string }
      if (json.ok) {
        toast.success(t('projectCreated'))
        router.push(`/projects/${json.data.id}`)
      } else {
        toast.error(json.message ?? t('errorCreating'))
      }
    } catch {
      toast.error(t('errorCreating'))
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <FolderKanban className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold">{t('newProject')}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>{t('projectDetails')}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="code">{t('code')} *</Label>
                <Input id="code" name="code" value={form.code} onChange={handleChange} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">{t('name')} *</Label>
                <Input id="name" name="name" value={form.name} onChange={handleChange} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="clientName">{t('client')}</Label>
              <Input id="clientName" name="clientName" value={form.clientName} onChange={handleChange} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">{t('description')}</Label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className={`${inputClass} h-auto`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="status">{t('status.label')}</Label>
                <select id="status" name="status" value={form.status} onChange={handleChange} className={inputClass}>
                  {['PLANNING','ACTIVE','ON_HOLD','COMPLETED','CANCELLED'].map(s => (
                    <option key={s} value={s}>{t(`status.${s}`)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="allocationMode">{t('allocationMode')}</Label>
                <select id="allocationMode" name="allocationMode" value={form.allocationMode} onChange={handleChange} className={inputClass}>
                  <option value="PERCENTAGE">{t('allocationPercent')}</option>
                  <option value="HOURS">{t('allocationHours')}</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="managerId">{t('projectManager')}</Label>
              <select id="managerId" name="managerId" value={form.managerId} onChange={handleChange} className={inputClass}>
                <option value="">{t('selectManager')}</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.fullName} ({e.employeeCode})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">{t('startDate')} *</Label>
                <Input id="startDate" name="startDate" type="date" value={form.startDate} onChange={handleChange} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">{t('endDate')}</Label>
                <Input id="endDate" name="endDate" type="date" value={form.endDate} onChange={handleChange} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="budgetAmount">{t('budget')}</Label>
                <Input id="budgetAmount" name="budgetAmount" type="number" min="0" value={form.budgetAmount} onChange={handleChange} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="currency">{t('currency')}</Label>
                <Input id="currency" name="currency" value={form.currency} onChange={handleChange} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="overheadFormula">{t('overheadFormula')}</Label>
              <Input id="overheadFormula" name="overheadFormula" placeholder="e.g. base * 1.18" value={form.overheadFormula} onChange={handleChange} />
              <p className="text-xs text-gray-400">{t('overheadFormulaHint')}</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="billable"
                name="billable"
                checked={form.billable}
                onChange={handleChange}
                className="h-4 w-4"
              />
              <Label htmlFor="billable">{t('billable')}</Label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('createProject')}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                {t('cancel')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            {t('safetyClassification')}
          </CardTitle>
          <p className="text-sm text-gray-500">{t('safetyClassificationHint')}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="countryId">{t('countryLabel')}</Label>
              <select
                id="countryId"
                name="countryId"
                value={form.countryId}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">{t('selectCountry')}</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="projectType">{t('projectTypeLabel')}</Label>
              <select
                id="projectType"
                name="projectType"
                value={form.projectType}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">{t('selectProjectType')}</option>
                {PROJECT_TYPES.map((pt) => (
                  <option key={pt} value={pt}>{t(`projectTypes.${pt}`)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="buildingHeightMeters">{t('buildingHeight')}</Label>
              <Input
                id="buildingHeightMeters"
                name="buildingHeightMeters"
                type="number"
                min="0"
                step="0.1"
                value={form.buildingHeightMeters}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="occupancyType">{t('occupancyType')}</Label>
              <Input
                id="occupancyType"
                name="occupancyType"
                value={form.occupancyType}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasElectricalWorks"
                name="hasElectricalWorks"
                checked={form.hasElectricalWorks}
                onChange={handleChange}
                className="h-4 w-4"
              />
              <Label htmlFor="hasElectricalWorks">{t('hasElectricalWorks')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasMultipleContractors"
                name="hasMultipleContractors"
                checked={form.hasMultipleContractors}
                onChange={handleChange}
                className="h-4 w-4"
              />
              <Label htmlFor="hasMultipleContractors">{t('hasMultipleContractors')}</Label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
