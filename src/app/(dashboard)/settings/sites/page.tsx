'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Search, Building2, Loader2, ChevronRight } from 'lucide-react'

interface SiteListItem {
  id: string
  name: string
  legalEntityName: string | null
  atecoCode: string | null
  city: string | null
  isActive: boolean
  dvr: { status: string; version: number } | null
  _count: { safetyRoles: number; workerGroups: number }
}

const DVR_STATUS_STYLE: Record<string, string> = {
  SETUP:                      'bg-gray-100 text-gray-600',
  DATA_COLLECTION:            'bg-blue-50 text-blue-700',
  READINESS_REVIEW:           'bg-amber-50 text-amber-700',
  ASSESSMENT_IN_PROGRESS:     'bg-purple-50 text-purple-700',
  CONSULTATION_AND_APPROVAL:  'bg-indigo-50 text-indigo-700',
  APPROVED_AND_MONITORED:     'bg-green-50 text-green-700',
}

const DEFAULT_FORM = { name: '', legalEntityName: '', vatNumber: '', atecoCode: '', address: '', city: '' }
type FormState = typeof DEFAULT_FORM

export default function SitesPage() {
  const t = useTranslations('sites')

  const [items, setItems]           = useState<SiteListItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm]             = useState<FormState>(DEFAULT_FORM)
  const [saving, setSaving]         = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/sites?search=${encodeURIComponent(search)}`)
      const json = await res.json() as { ok: boolean; data: SiteListItem[] }
      if (json.ok) setItems(json.data ?? [])
    } catch {
      /* silent — table stays empty */
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { void loadData() }, [loadData])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error(t('nameRequired'))
      return
    }
    setSaving(true)
    try {
      const res  = await fetch('/api/sites', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const json = await res.json() as { ok: boolean; message?: string }
      if (json.ok) {
        toast.success(t('created'))
        setDialogOpen(false)
        setForm(DEFAULT_FORM)
        void loadData()
      } else {
        toast.error(json.message ?? t('errorSaving'))
      }
    } catch {
      toast.error(t('errorSaving'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            {t('title')}
          </h1>
          <p className="text-gray-500 mt-1">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t('addSite')}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('sitesList')}</CardTitle>
          <CardDescription>{items.length} {items.length === 1 ? t('site') : t('sitesPlural')}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-gray-400 py-12">{t('noResults')}</p>
          ) : (
            <div className="divide-y">
              {items.map((site) => (
                <Link
                  key={site.id}
                  href={`/settings/sites/${site.id}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 rounded px-2 -mx-2"
                >
                  <div>
                    <p className="font-medium text-gray-900">{site.name}</p>
                    <p className="text-xs text-gray-500">
                      {site.legalEntityName ?? t('noLegalEntity')}
                      {site.city ? ` · ${site.city}` : ''}
                      {site.atecoCode ? ` · ATECO ${site.atecoCode}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${DVR_STATUS_STYLE[site.dvr?.status ?? 'SETUP']}`}>
                      {t(`status.${site.dvr?.status ?? 'SETUP'}`)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('addSite')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="site-name">{t('siteName')} *</Label>
              <Input id="site-name" name="name" value={form.name} onChange={handleChange} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="site-legal">{t('legalEntityName')}</Label>
              <Input id="site-legal" name="legalEntityName" value={form.legalEntityName} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="site-vat">{t('vatNumber')}</Label>
                <Input id="site-vat" name="vatNumber" value={form.vatNumber} onChange={handleChange} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="site-ateco">{t('atecoCode')}</Label>
                <Input id="site-ateco" name="atecoCode" value={form.atecoCode} onChange={handleChange} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="site-address">{t('address')}</Label>
              <Input id="site-address" name="address" value={form.address} onChange={handleChange} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="site-city">{t('city')}</Label>
              <Input id="site-city" name="city" value={form.city} onChange={handleChange} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
