'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil, ShieldCheck, Loader2, Search } from 'lucide-react'

interface Country { id: string; code: string; name: string }

interface SafetyRequirement {
  id: string
  countryId: string
  country: { name: string }
  projectTypes: string[]
  category: string
  title: string
  description: string
  legalReference: string
  triggerCondition: string | null
  requiredRole: string | null
  requiredDocument: string | null
  mandatory: boolean
  recurring: boolean
  recurrenceMonths: number | null
  sortOrder: number
  active: boolean
}

const CATEGORIES = [
  'GENERAL_OHS', 'CONSTRUCTION_SITE', 'FIRE_SAFETY',
  'ELECTRICAL_SAFETY', 'SPECIALIZED_RISK', 'ENVIRONMENTAL',
]

const PROJECT_TYPES = [
  'FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE', 'ELECTRICAL_INFRASTRUCTURE', 'DATA_CENTER', 'OTHER',
]

const DEFAULT_FORM = {
  countryId:        '',
  projectTypes:     [] as string[],
  category:         'GENERAL_OHS',
  title:            '',
  description:      '',
  legalReference:   '',
  triggerCondition: '',
  requiredRole:     '',
  requiredDocument: '',
  mandatory:        true,
  recurring:        false,
  recurrenceMonths: '',
  sortOrder:        '0',
  active:           true,
}

type FormState = typeof DEFAULT_FORM

export default function SafetyRequirementsLibraryPage() {
  const t = useTranslations('safetyLibrary')

  const [items, setItems]           = useState<SafetyRequirement[]>([])
  const [countries, setCountries]   = useState<Country[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterActive, setFilterActive]   = useState<'all' | 'active' | 'inactive'>('active')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId]         = useState<string | null>(null)
  const [form, setForm]             = useState<FormState>(DEFAULT_FORM)
  const [saving, setSaving]         = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterCountry)  params.set('countryId', filterCountry)
      if (filterCategory) params.set('category',  filterCategory)
      if (filterActive !== 'all') params.set('active', filterActive === 'active' ? 'true' : 'false')
      if (search) params.set('search', search)

      const res  = await fetch(`/api/safety-requirements?${params.toString()}`)
      const json = await res.json() as { ok: boolean; data: SafetyRequirement[] }
      if (json.ok) setItems(json.data ?? [])
      else toast.error(t('errorLoading'))
    } catch {
      toast.error(t('errorLoading'))
    } finally {
      setLoading(false)
    }
  }, [filterCountry, filterCategory, filterActive, search, t])

  useEffect(() => {
    void (async () => {
      try {
        const res  = await fetch('/api/countries')
        const json = await res.json() as { ok: boolean; data: Country[] }
        if (json.ok) setCountries(json.data)
      } catch { /* silent */ }
    })()
  }, [])

  useEffect(() => { void loadData() }, [loadData])

  function openCreate() {
    setEditId(null)
    setForm(DEFAULT_FORM)
    setDialogOpen(true)
  }

  function openEdit(item: SafetyRequirement) {
    setEditId(item.id)
    setForm({
      countryId:        item.countryId,
      projectTypes:     item.projectTypes,
      category:         item.category,
      title:            item.title,
      description:      item.description,
      legalReference:   item.legalReference,
      triggerCondition: item.triggerCondition ?? '',
      requiredRole:     item.requiredRole ?? '',
      requiredDocument: item.requiredDocument ?? '',
      mandatory:        item.mandatory,
      recurring:        item.recurring,
      recurrenceMonths: item.recurrenceMonths != null ? String(item.recurrenceMonths) : '',
      sortOrder:        String(item.sortOrder),
      active:           item.active,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.countryId || !form.legalReference.trim()) {
      toast.error('Title, country and legal reference are required.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        recurrenceMonths: form.recurrenceMonths ? Number(form.recurrenceMonths) : null,
        sortOrder:        Number(form.sortOrder) || 0,
        triggerCondition: form.triggerCondition || null,
        requiredRole:     form.requiredRole || null,
        requiredDocument: form.requiredDocument || null,
      }
      const res = editId
        ? await fetch(`/api/safety-requirements/${editId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/safety-requirements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      const json = await res.json() as { ok: boolean }
      if (json.ok) {
        toast.success(t('saved'))
        setDialogOpen(false)
        void loadData()
      } else {
        toast.error(t('errorSaving'))
      }
    } catch {
      toast.error(t('errorSaving'))
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(item: SafetyRequirement) {
    try {
      const res  = await fetch(`/api/safety-requirements/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !item.active }),
      })
      const json = await res.json() as { ok: boolean }
      if (json.ok) {
        toast.success(item.active ? t('deactivated') : t('saved'))
        void loadData()
      }
    } catch { /* silent */ }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setForm((prev) => ({ ...prev, [name]: checked }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  function toggleProjectType(pt: string) {
    setForm((prev) => ({
      ...prev,
      projectTypes: prev.projectTypes.includes(pt)
        ? prev.projectTypes.filter((x) => x !== pt)
        : [...prev.projectTypes, pt],
    }))
  }

  const inputClass = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            {t('title')}
          </h1>
          <p className="text-gray-500 mt-1">{t('subtitle')}</p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t('addRequirement')}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by title…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} className={inputClass}>
              <option value="">{t('country')}: All</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={inputClass}>
              <option value="">{t('allCategories')}</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{t(`categories.${cat}`)}</option>
              ))}
            </select>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
              className={inputClass}
            >
              <option value="all">{t('allStatuses')}</option>
              <option value="active">{t('active')}</option>
              <option value="inactive">{t('inactive')}</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{items.length} requirement{items.length !== 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : items.length === 0 ? (
            <p className="text-center text-gray-400 py-12">{t('noResults')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium pr-4">{t('title_field')}</th>
                    <th className="pb-2 font-medium pr-4">{t('category')}</th>
                    <th className="pb-2 font-medium pr-4">{t('country')}</th>
                    <th className="pb-2 font-medium pr-4">{t('projectTypesCol')}</th>
                    <th className="pb-2 font-medium pr-4">{t('mandatory')}</th>
                    <th className="pb-2 font-medium pr-4">{t('recurring')}</th>
                    <th className="pb-2 font-medium pr-4">{t('active')}</th>
                    <th className="pb-2 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="py-3 pr-4">
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{item.legalReference}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="text-xs">{t(`categories.${item.category}`)}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-gray-600">{item.country.name}</td>
                      <td className="py-3 pr-4">
                        <div className="flex gap-1 flex-wrap max-w-40">
                          {item.projectTypes.length === 0
                            ? <span className="text-gray-400 text-xs">All</span>
                            : item.projectTypes.map((pt) => (
                                <Badge key={pt} variant="secondary" className="text-xs py-0">{pt.split('_')[0]}</Badge>
                              ))
                          }
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        {item.mandatory ? <Badge variant="destructive" className="text-xs">M</Badge> : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-3 pr-4">
                        {item.recurring ? <Badge variant="outline" className="text-xs">R</Badge> : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs font-medium ${item.active ? 'text-green-600' : 'text-gray-400'}`}>
                          {item.active ? t('active') : t('inactive')}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void handleToggleActive(item)}
                            className={item.active ? 'text-amber-600' : 'text-green-600'}
                          >
                            {item.active ? t('deactivate') : t('activate')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Requirement' : t('addRequirement')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="dlg-countryId">{t('country')} *</Label>
                <select id="dlg-countryId" name="countryId" value={form.countryId} onChange={handleChange} className={inputClass}>
                  <option value="">Select country…</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dlg-category">{t('category')} *</Label>
                <select id="dlg-category" name="category" value={form.category} onChange={handleChange} className={inputClass}>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{t(`categories.${cat}`)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t('projectTypesCol')}</Label>
              <div className="flex gap-2 flex-wrap">
                {PROJECT_TYPES.map((pt) => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => toggleProjectType(pt)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      form.projectTypes.includes(pt)
                        ? 'bg-blue-100 border-blue-400 text-blue-800'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    {pt.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400">Leave empty to apply to all project types.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dlg-title">{t('title_field')} *</Label>
              <Input id="dlg-title" name="title" value={form.title} onChange={handleChange} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dlg-description">{t('description_field')}</Label>
              <textarea
                id="dlg-description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className={`${inputClass} h-auto py-2`}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dlg-legalReference">{t('legalRef_field')} *</Label>
              <Input id="dlg-legalReference" name="legalReference" value={form.legalReference} onChange={handleChange} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="dlg-requiredRole">{t('requiredRole')}</Label>
                <Input id="dlg-requiredRole" name="requiredRole" value={form.requiredRole} onChange={handleChange} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dlg-requiredDocument">{t('requiredDocument')}</Label>
                <Input id="dlg-requiredDocument" name="requiredDocument" value={form.requiredDocument} onChange={handleChange} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dlg-triggerCondition">{t('triggerCondition')}</Label>
              <Input id="dlg-triggerCondition" name="triggerCondition" value={form.triggerCondition} onChange={handleChange} placeholder="e.g. hasMultipleContractors = true" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="dlg-recurrenceMonths">{t('recurrenceMonths')}</Label>
                <Input id="dlg-recurrenceMonths" name="recurrenceMonths" type="number" min="1" value={form.recurrenceMonths} onChange={handleChange} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dlg-sortOrder">{t('sortOrder')}</Label>
                <Input id="dlg-sortOrder" name="sortOrder" type="number" min="0" value={form.sortOrder} onChange={handleChange} />
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="dlg-mandatory" name="mandatory" checked={form.mandatory} onChange={handleChange} className="h-4 w-4" />
                <Label htmlFor="dlg-mandatory">{t('mandatory')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="dlg-recurring" name="recurring" checked={form.recurring} onChange={handleChange} className="h-4 w-4" />
                <Label htmlFor="dlg-recurring">{t('recurring')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="dlg-active" name="active" checked={form.active} onChange={handleChange} className="h-4 w-4" />
                <Label htmlFor="dlg-active">{t('active')}</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
