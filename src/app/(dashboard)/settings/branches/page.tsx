'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Pencil, Trash2, Loader2, GitBranch, Star } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Branch {
  id: string
  name: string
  nameAr: string | null
  code: string | null
  description: string | null
  nationalCode: string | null
  molId: string | null
  crId: string | null
  country: string | null
  city: string | null
  address: string | null
  poBox: string | null
  telephone: string | null
  fax: string | null
  email: string | null
  website: string | null
  socialSecurityLocation: string | null
  logoUrl: string | null
  managerName: string | null
  establishedDate: string | null
  costCenter: string | null
  baseCurrency: string | null
  taxCurrency: string | null
  taxProfile: string | null
  countryProfile: string | null
  isHeadQuarter: boolean
  deductNationalTax: boolean
  syncFromHeadQuarter: boolean
  canModifyEmployeeTax: boolean
  isActive: boolean
  _count: { orgUnits: number }
}

const DEFAULT_FORM = {
  name: '', nameAr: '', code: '', description: '', nationalCode: '',
  molId: '', crId: '',
  country: '', city: '', address: '', poBox: '', telephone: '', fax: '',
  email: '', website: '', socialSecurityLocation: '',
  managerName: '', establishedDate: '', costCenter: '',
  baseCurrency: '', taxCurrency: '', taxProfile: '', countryProfile: '',
  isHeadQuarter: false, deductNationalTax: false,
  syncFromHeadQuarter: false, canModifyEmployeeTax: false,
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BranchesPage() {
  const t  = useTranslations('settings')
  const tc = useTranslations('common')

  const [branches,     setBranches]     = useState<Branch[]>([])
  const [loading,      setLoading]      = useState(true)
  const [dialog,       setDialog]       = useState(false)
  const [editing,      setEditing]      = useState<Branch | null>(null)
  const [form,         setForm]         = useState(DEFAULT_FORM)
  const [saving,       setSaving]       = useState(false)
  const [activeTab,    setActiveTab]    = useState('general')

  // ── Load ─────────────────────────────────────────────────────────────────────

  const loadBranches = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/branches')
      const json = await res.json()
      if (json.ok) setBranches(json.data)
    } catch {
      toast.error(tc('error'))
    } finally {
      setLoading(false)
    }
  }, [tc])

  useEffect(() => { void loadBranches() }, [loadBranches])

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function setField<K extends keyof typeof DEFAULT_FORM>(key: K, val: typeof DEFAULT_FORM[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function openAdd() {
    setEditing(null)
    setForm(DEFAULT_FORM)
    setActiveTab('general')
    setDialog(true)
  }

  function openEdit(b: Branch) {
    setEditing(b)
    setForm({
      name:                   b.name,
      nameAr:                 b.nameAr                 ?? '',
      code:                   b.code                   ?? '',
      description:            b.description            ?? '',
      nationalCode:           b.nationalCode           ?? '',
      molId:                  b.molId                  ?? '',
      crId:                   b.crId                   ?? '',
      country:                b.country                ?? '',
      city:                   b.city                   ?? '',
      address:                b.address                ?? '',
      poBox:                  b.poBox                  ?? '',
      telephone:              b.telephone              ?? '',
      fax:                    b.fax                    ?? '',
      email:                  b.email                  ?? '',
      website:                b.website                ?? '',
      socialSecurityLocation: b.socialSecurityLocation ?? '',
      managerName:            b.managerName            ?? '',
      establishedDate:        b.establishedDate
        ? new Date(b.establishedDate).toISOString().substring(0, 10)
        : '',
      costCenter:             b.costCenter             ?? '',
      baseCurrency:           b.baseCurrency           ?? '',
      taxCurrency:            b.taxCurrency            ?? '',
      taxProfile:             b.taxProfile             ?? '',
      countryProfile:         b.countryProfile         ?? '',
      isHeadQuarter:          b.isHeadQuarter,
      deductNationalTax:      b.deductNationalTax,
      syncFromHeadQuarter:    b.syncFromHeadQuarter,
      canModifyEmployeeTax:   b.canModifyEmployeeTax,
    })
    setActiveTab('general')
    setDialog(true)
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function saveBranch() {
    if (!form.name.trim()) { toast.error(t('branchNameRequired')); return }
    setSaving(true)
    try {
      const url    = editing ? `/api/branches/${editing.id}` : '/api/branches'
      const method = editing ? 'PATCH' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:                   form.name.trim(),
          nameAr:                 form.nameAr.trim()                   || null,
          code:                   form.code.trim()                     || null,
          description:            form.description.trim()              || null,
          nationalCode:           form.nationalCode.trim()             || null,
          molId:                  form.molId.trim()                    || null,
          crId:                   form.crId.trim()                     || null,
          country:                form.country.trim()                  || null,
          city:                   form.city.trim()                     || null,
          address:                form.address.trim()                  || null,
          poBox:                  form.poBox.trim()                    || null,
          telephone:              form.telephone.trim()                || null,
          fax:                    form.fax.trim()                      || null,
          email:                  form.email.trim()                    || null,
          website:                form.website.trim()                  || null,
          socialSecurityLocation: form.socialSecurityLocation.trim()   || null,
          managerName:            form.managerName.trim()              || null,
          establishedDate:        form.establishedDate                 || null,
          costCenter:             form.costCenter.trim()               || null,
          baseCurrency:           form.baseCurrency.trim()             || null,
          taxCurrency:            form.taxCurrency.trim()              || null,
          taxProfile:             form.taxProfile.trim()               || null,
          countryProfile:         form.countryProfile.trim()           || null,
          isHeadQuarter:          form.isHeadQuarter,
          deductNationalTax:      form.deductNationalTax,
          syncFromHeadQuarter:    form.syncFromHeadQuarter,
          canModifyEmployeeTax:   form.canModifyEmployeeTax,
        }),
      })
      const json = await res.json()
      if (!json.ok) { toast.error(json.error ?? tc('error')); return }

      if (editing) {
        // If newly set as HQ, clear HQ flag on other branches in local state
        if (form.isHeadQuarter && !editing.isHeadQuarter) {
          setBranches(prev => prev.map(b =>
            b.id === json.data.id ? json.data : { ...b, isHeadQuarter: false }
          ))
        } else {
          setBranches(prev => prev.map(b => b.id === json.data.id ? json.data : b))
        }
        toast.success(t('branchUpdated'))
      } else {
        if (form.isHeadQuarter) {
          setBranches(prev => [
            ...prev.map(b => ({ ...b, isHeadQuarter: false })),
            json.data,
          ])
        } else {
          setBranches(prev => [...prev, json.data])
        }
        toast.success(t('branchCreated'))
      }
      setDialog(false)
    } catch {
      toast.error(tc('error'))
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  async function deleteBranch(b: Branch) {
    if (b._count.orgUnits > 0) {
      toast.error(t('branchHasUnits', { count: b._count.orgUnits }))
      return
    }
    if (!confirm(`${tc('confirm')}: delete "${b.name}"?`)) return
    const res  = await fetch(`/api/branches/${b.id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!json.ok) { toast.error(json.error ?? tc('error')); return }
    setBranches(prev => prev.filter(x => x.id !== b.id))
    toast.success(t('branchDeleted'))
  }

  // ── Toggle active ────────────────────────────────────────────────────────────

  async function toggleActive(b: Branch) {
    const res  = await fetch(`/api/branches/${b.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ isActive: !b.isActive }),
    })
    const json = await res.json()
    if (!json.ok) { toast.error(json.error ?? tc('error')); return }
    setBranches(prev => prev.map(x => x.id === b.id ? json.data : x))
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('branchesTitle')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('branchesDesc')}</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-blue-600" />
              <div>
                <CardTitle className="text-base">{t('branchesTitle')}</CardTitle>
                <CardDescription className="mt-0.5">{t('branchesListDesc')}</CardDescription>
              </div>
            </div>
            <Button size="sm" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-1" />
              {t('addBranch')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {branches.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <GitBranch className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">{t('noBranches')}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={openAdd}>
                <Plus className="w-4 h-4 mr-1" /> {t('addBranch')}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="text-left px-4 py-2">{t('branchName')}</th>
                    <th className="text-left px-4 py-2">{t('branchCode')}</th>
                    <th className="text-left px-4 py-2">{tc('country')}</th>
                    <th className="text-left px-4 py-2">{t('baseCurrency')}</th>
                    <th className="text-left px-4 py-2">{t('managerName')}</th>
                    <th className="text-center px-4 py-2">{t('hqBadge')}</th>
                    <th className="text-center px-4 py-2">{tc('orgUnits')}</th>
                    <th className="text-center px-4 py-2">{tc('status')}</th>
                    <th className="text-right px-4 py-2">{tc('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {branches.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{b.name}</div>
                        {b.nameAr && <div className="text-xs text-gray-400" dir="rtl">{b.nameAr}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {b.code
                          ? <code className="text-xs bg-gray-100 rounded px-1.5 py-0.5">{b.code}</code>
                          : <span className="text-gray-400">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {b.country ? `${b.country}${b.city ? `, ${b.city}` : ''}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {b.baseCurrency
                          ? <Badge variant="outline" className="text-xs font-mono">{b.baseCurrency}</Badge>
                          : <span className="text-gray-400">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-gray-600">{b.managerName ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {b.isHeadQuarter && (
                          <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs gap-1">
                            <Star className="w-3 h-3" /> {t('hqBadge')}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary">{b._count.orgUnits}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Switch
                          checked={b.isActive}
                          onCheckedChange={() => toggleActive(b)}
                          aria-label={b.isActive ? tc('inactive') : tc('active')}
                        />
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteBranch(b)}
                          disabled={b._count.orgUnits > 0}
                          title={b._count.orgUnits > 0 ? t('branchHasUnitsHint') : tc('delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog ──────────────────────────────────────────────────────────── */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? t('editBranch') : t('addBranch')}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <TabsList className="flex w-full overflow-x-auto gap-1 h-auto flex-wrap">
              <TabsTrigger value="general"    className="text-xs px-3 py-1.5 flex-shrink-0">{t('tabGeneral')}</TabsTrigger>
              <TabsTrigger value="contact"    className="text-xs px-3 py-1.5 flex-shrink-0">{t('tabContact')}</TabsTrigger>
              <TabsTrigger value="legal"      className="text-xs px-3 py-1.5 flex-shrink-0">{t('tabLegal')}</TabsTrigger>
              <TabsTrigger value="financial"  className="text-xs px-3 py-1.5 flex-shrink-0">{t('tabFinancial')}</TabsTrigger>
              <TabsTrigger value="settings"   className="text-xs px-3 py-1.5 flex-shrink-0">{t('tabSettings')}</TabsTrigger>
            </TabsList>

            {/* ── Tab 1: General ─────────────────────────────────────────── */}
            <TabsContent value="general" className="space-y-4 pt-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t('branchName')} *</Label>
                  <Input
                    value={form.name}
                    onChange={e => setField('name', e.target.value)}
                    placeholder="e.g. Riyadh Branch"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('arabicName')}</Label>
                  <Input
                    value={form.nameAr}
                    onChange={e => setField('nameAr', e.target.value)}
                    placeholder="مثال: فرع الرياض"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('branchCode')}</Label>
                  <Input
                    value={form.code}
                    onChange={e => setField('code', e.target.value)}
                    placeholder="e.g. RUH-001"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('nationalCode')}</Label>
                  <Input
                    value={form.nationalCode}
                    onChange={e => setField('nationalCode', e.target.value)}
                    placeholder={t('nationalCodePlaceholder')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('managerName')}</Label>
                  <Input
                    value={form.managerName}
                    onChange={e => setField('managerName', e.target.value)}
                    placeholder="e.g. Ahmed Al-Rashid"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('establishedDate')}</Label>
                  <Input
                    type="date"
                    value={form.establishedDate}
                    onChange={e => setField('establishedDate', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t('description')}</Label>
                <Input
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  placeholder={t('descriptionPlaceholder')}
                />
              </div>
            </TabsContent>

            {/* ── Tab 2: Location & Contact ──────────────────────────────── */}
            <TabsContent value="contact" className="space-y-4 pt-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{tc('country')}</Label>
                  <Input
                    value={form.country}
                    onChange={e => setField('country', e.target.value)}
                    placeholder="e.g. Saudi Arabia"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{tc('city')}</Label>
                  <Input
                    value={form.city}
                    onChange={e => setField('city', e.target.value)}
                    placeholder="e.g. Riyadh"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('telephone')}</Label>
                  <Input
                    value={form.telephone}
                    onChange={e => setField('telephone', e.target.value)}
                    placeholder="+966 11 XXX XXXX"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('fax')}</Label>
                  <Input
                    value={form.fax}
                    onChange={e => setField('fax', e.target.value)}
                    placeholder="+966 11 XXX XXXX"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{tc('email')}</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => setField('email', e.target.value)}
                    placeholder="branch@company.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('website')}</Label>
                  <Input
                    value={form.website}
                    onChange={e => setField('website', e.target.value)}
                    placeholder="https://www.company.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('poBox')}</Label>
                  <Input
                    value={form.poBox}
                    onChange={e => setField('poBox', e.target.value)}
                    placeholder="P.O. Box 12345"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('socialSecurityLocation')}</Label>
                  <Input
                    value={form.socialSecurityLocation}
                    onChange={e => setField('socialSecurityLocation', e.target.value)}
                    placeholder={t('socialSecurityLocationPlaceholder')}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t('address')}</Label>
                <Input
                  value={form.address}
                  onChange={e => setField('address', e.target.value)}
                  placeholder="Full street address"
                />
              </div>
            </TabsContent>

            {/* ── Tab 3: Legal & IDs ─────────────────────────────────────── */}
            <TabsContent value="legal" className="space-y-4 pt-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t('molId')}</Label>
                  <Input
                    value={form.molId}
                    onChange={e => setField('molId', e.target.value)}
                    placeholder={t('molIdPlaceholder')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('crId')}</Label>
                  <Input
                    value={form.crId}
                    onChange={e => setField('crId', e.target.value)}
                    placeholder={t('crIdPlaceholder')}
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>{t('costCenter')}</Label>
                  <Input
                    value={form.costCenter}
                    onChange={e => setField('costCenter', e.target.value)}
                    placeholder="e.g. CC-1001"
                  />
                </div>
              </div>
            </TabsContent>

            {/* ── Tab 4: Financial & Tax ─────────────────────────────────── */}
            <TabsContent value="financial" className="space-y-4 pt-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t('baseCurrency')}</Label>
                  <Input
                    value={form.baseCurrency}
                    onChange={e => setField('baseCurrency', e.target.value)}
                    placeholder="e.g. SAR, USD, EUR"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('taxCurrency')}</Label>
                  <Input
                    value={form.taxCurrency}
                    onChange={e => setField('taxCurrency', e.target.value)}
                    placeholder="e.g. SAR, USD"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('taxProfile')}</Label>
                  <Input
                    value={form.taxProfile}
                    onChange={e => setField('taxProfile', e.target.value)}
                    placeholder={t('taxProfilePlaceholder')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('countryProfile')}</Label>
                  <Input
                    value={form.countryProfile}
                    onChange={e => setField('countryProfile', e.target.value)}
                    placeholder={t('countryProfilePlaceholder')}
                  />
                </div>
              </div>
            </TabsContent>

            {/* ── Tab 5: Settings / Flags ────────────────────────────────── */}
            <TabsContent value="settings" className="space-y-5 pt-3">
              <div className="rounded-lg border border-gray-100 divide-y divide-gray-100">
                {([
                  ['isHeadQuarter',        t('isHeadQuarter'),        t('isHeadQuarterDesc')],
                  ['deductNationalTax',    t('deductNationalTax'),    t('deductNationalTaxDesc')],
                  ['syncFromHeadQuarter',  t('syncFromHeadQuarter'),  t('syncFromHeadQuarterDesc')],
                  ['canModifyEmployeeTax', t('canModifyEmployeeTax'), t('canModifyEmployeeTaxDesc')],
                ] as [keyof typeof DEFAULT_FORM, string, string][]).map(([key, label, desc]) => (
                  <div key={key} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{label}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                    <Switch
                      checked={form[key] as boolean}
                      onCheckedChange={v => setField(key, v)}
                    />
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialog(false)}>{tc('cancel')}</Button>
            <Button onClick={saveBranch} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
