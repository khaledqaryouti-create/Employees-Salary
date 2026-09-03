'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'

import { Plus, Pencil, Trash2, Search, Globe, Loader2 } from 'lucide-react'

interface Country {
  id: string
  code: string
  name: string
  _count: { safetyRequirements: number; projects: number }
}

const DEFAULT_FORM = { code: '', name: '' }
type FormState = typeof DEFAULT_FORM

export default function CountriesPage() {
  const t = useTranslations('countries')
  const tn = useTranslations('nav')

  const [items, setItems]           = useState<Country[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId]         = useState<string | null>(null)
  const [form, setForm]             = useState<FormState>(DEFAULT_FORM)
  const [saving, setSaving]         = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Country | null>(null)
  const [deleting, setDeleting]     = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/countries?search=${encodeURIComponent(search)}`)
      const json = await res.json() as { ok: boolean; data: Country[] }
      if (json.ok) setItems(json.data ?? [])
    } catch {
      /* silent — table stays empty */
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { void loadData() }, [loadData])

  function openCreate() {
    setEditId(null)
    setForm(DEFAULT_FORM)
    setDialogOpen(true)
  }

  function openEdit(country: Country) {
    setEditId(country.id)
    setForm({ code: country.code, name: country.name })
    setDialogOpen(true)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSave() {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Code and name are required.')
      return
    }
    if (form.code.trim().length !== 2) {
      toast.error(t('codeHint'))
      return
    }
    setSaving(true)
    try {
      const url    = editId ? `/api/countries/${editId}` : '/api/countries'
      const method = editId ? 'PATCH' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: form.code.trim().toUpperCase(), name: form.name.trim() }),
      })
      const json = await res.json() as { ok: boolean; message?: string }
      if (json.ok) {
        toast.success(t('saved'))
        setDialogOpen(false)
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

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res  = await fetch(`/api/countries/${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json() as { ok: boolean; code?: string; message?: string }
      if (json.ok) {
        toast.success(t('deleted'))
        setDeleteTarget(null)
        void loadData()
      } else if (json.code === 'CONFLICT') {
        toast.error(t('inUse'))
        setDeleteTarget(null)
      } else {
        toast.error(json.message ?? t('errorDeleting'))
      }
    } catch {
      toast.error(t('errorDeleting'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-600" />
            {t('title')}
          </h1>
          <p className="text-gray-500 mt-1">{t('subtitle')}</p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t('addCountry')}
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
          <CardTitle>{tn('countries')}</CardTitle>
          <CardDescription>{items.length} {items.length === 1 ? 'country' : 'countries'}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-gray-400 py-12">{t('noResults')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium pr-4 w-24">{t('code')}</th>
                  <th className="pb-2 font-medium pr-4">{t('name')}</th>
                  <th className="pb-2 font-medium pr-4 text-right">{t('safetyReqs')}</th>
                  <th className="pb-2 font-medium pr-4 text-right">{t('projects')}</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((country) => {
                  const inUse = country._count.safetyRequirements > 0 || country._count.projects > 0
                  return (
                    <tr key={country.id} className="hover:bg-gray-50">
                      <td className="py-3 pr-4">
                        <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs">
                          {country.code}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-medium">{country.name}</td>
                      <td className="py-3 pr-4 text-right text-gray-600">
                        {country._count.safetyRequirements}
                      </td>
                      <td className="py-3 pr-4 text-right text-gray-600">
                        {country._count.projects}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(country)}
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteTarget(country)}
                            disabled={inUse}
                            title={inUse ? t('inUse') : t('deleteConfirm')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editId ? t('editCountry') : t('addCountry')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="dlg-code">{t('code')} *</Label>
              <Input
                id="dlg-code"
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder={t('codePlaceholder')}
                maxLength={2}
                className="uppercase"
              />
              <p className="text-xs text-gray-400">{t('codeHint')}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dlg-name">{t('name')} *</Label>
              <Input
                id="dlg-name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Italy"
              />
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

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open: boolean) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('deleteConfirm')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            {deleteTarget?.name} ({deleteTarget?.code}) will be permanently removed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
