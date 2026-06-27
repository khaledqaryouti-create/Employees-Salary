'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Loader2, Briefcase, Tag } from 'lucide-react'
import { Switch } from '@/components/ui/switch'

// ── Types ──────────────────────────────────────────────────────────────────────

interface JobFamily {
  id: string
  name: string
  nameAr: string | null
  description: string | null
  isActive: boolean
  _count: { jobTitles: number }
}

interface JobTitle {
  id: string
  name: string
  nameAr: string | null
  grade: string | null
  mappingCode: string | null
  integrationCode: string | null
  isActive: boolean
  jobFamilyId: string
  jobFamily: { id: string; name: string }
  _count: { employees: number }
}

// ── Default form states ────────────────────────────────────────────────────────

const DEFAULT_FAMILY = { name: '', nameAr: '', description: '' }
const DEFAULT_TITLE  = { name: '', nameAr: '', grade: '', mappingCode: '', integrationCode: '', jobFamilyId: '' }

// ── Component ─────────────────────────────────────────────────────────────────

export default function JobTitlesPage() {
  const t  = useTranslations('settings')
  const tc = useTranslations('common')

  // ─ State: data
  const [families,       setFamilies]       = useState<JobFamily[]>([])
  const [titles,         setTitles]         = useState<JobTitle[]>([])
  const [loading,        setLoading]        = useState(true)

  // ─ State: family dialog
  const [familyDialog,   setFamilyDialog]   = useState(false)
  const [editingFamily,  setEditingFamily]  = useState<JobFamily | null>(null)
  const [familyForm,     setFamilyForm]     = useState(DEFAULT_FAMILY)
  const [savingFamily,   setSavingFamily]   = useState(false)

  // ─ State: title dialog
  const [titleDialog,    setTitleDialog]    = useState(false)
  const [editingTitle,   setEditingTitle]   = useState<JobTitle | null>(null)
  const [titleForm,      setTitleForm]      = useState(DEFAULT_TITLE)
  const [savingTitle,    setSavingTitle]    = useState(false)

  // ─ State: filter
  const [filterFamily,   setFilterFamily]   = useState('all')

  // ── Load data ────────────────────────────────────────────────────────────────

  async function loadAll() {
    setLoading(true)
    try {
      const [fRes, tRes] = await Promise.all([
        fetch('/api/job-families'),
        fetch('/api/job-titles'),
      ])
      const [fJson, tJson] = await Promise.all([fRes.json(), tRes.json()])
      if (fJson.ok) setFamilies(fJson.data)
      if (tJson.ok) setTitles(tJson.data)
    } catch {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  // ── Filtered titles ───────────────────────────────────────────────────────────

  const filteredTitles = useMemo(() => {
    if (filterFamily === 'all') return titles
    return titles.filter(t => t.jobFamilyId === filterFamily)
  }, [titles, filterFamily])

  // ── Family CRUD ───────────────────────────────────────────────────────────────

  function openAddFamily() {
    setEditingFamily(null)
    setFamilyForm(DEFAULT_FAMILY)
    setFamilyDialog(true)
  }

  function openEditFamily(f: JobFamily) {
    setEditingFamily(f)
    setFamilyForm({ name: f.name, nameAr: f.nameAr ?? '', description: f.description ?? '' })
    setFamilyDialog(true)
  }

  async function saveFamily() {
    if (!familyForm.name.trim()) { toast.error(t('jobFamilyNameRequired')); return }
    setSavingFamily(true)
    try {
      const url    = editingFamily ? `/api/job-families/${editingFamily.id}` : '/api/job-families'
      const method = editingFamily ? 'PATCH' : 'POST'
      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        familyForm.name.trim(),
          nameAr:      familyForm.nameAr.trim()      || null,
          description: familyForm.description.trim() || null,
        }),
      })
      const json = await res.json()
      if (!json.ok) { toast.error(json.error ?? tc('error')); return }

      if (editingFamily) {
        setFamilies(prev => prev.map(f => f.id === json.data.id ? json.data : f))
        toast.success(t('jobFamilyUpdated'))
      } else {
        setFamilies(prev => [...prev, json.data])
        toast.success(t('jobFamilyCreated'))
      }
      setFamilyDialog(false)
    } catch {
      toast.error(tc('error'))
    } finally {
      setSavingFamily(false)
    }
  }

  async function deleteFamily(f: JobFamily) {
    if (f._count.jobTitles > 0) {
      toast.error(t('jobFamilyHasTitles', { count: f._count.jobTitles }))
      return
    }
    if (!confirm(`${tc('confirm')}: delete "${f.name}"?`)) return
    const res  = await fetch(`/api/job-families/${f.id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!json.ok) { toast.error(json.error ?? tc('error')); return }
    setFamilies(prev => prev.filter(x => x.id !== f.id))
    toast.success(t('jobFamilyDeleted'))
  }

  async function toggleFamilyActive(f: JobFamily) {
    const res  = await fetch(`/api/job-families/${f.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !f.isActive }),
    })
    const json = await res.json()
    if (!json.ok) { toast.error(json.error ?? tc('error')); return }
    setFamilies(prev => prev.map(x => x.id === f.id ? json.data : x))
  }

  // ── Title CRUD ────────────────────────────────────────────────────────────────

  function openAddTitle() {
    setEditingTitle(null)
    setTitleForm({
      ...DEFAULT_TITLE,
      jobFamilyId: filterFamily !== 'all' ? filterFamily : '',
    })
    setTitleDialog(true)
  }

  function openEditTitle(t: JobTitle) {
    setEditingTitle(t)
    setTitleForm({
      name:            t.name,
      nameAr:          t.nameAr          ?? '',
      grade:           t.grade           ?? '',
      mappingCode:     t.mappingCode     ?? '',
      integrationCode: t.integrationCode ?? '',
      jobFamilyId:     t.jobFamilyId,
    })
    setTitleDialog(true)
  }

  async function saveTitle() {
    if (!titleForm.name.trim())      { toast.error(t('jobTitleNameRequired')); return }
    if (!titleForm.jobFamilyId)      { toast.error(t('jobFamilyRequired'));    return }
    setSavingTitle(true)
    try {
      const url    = editingTitle ? `/api/job-titles/${editingTitle.id}` : '/api/job-titles'
      const method = editingTitle ? 'PATCH' : 'POST'
      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:            titleForm.name.trim(),
          nameAr:          titleForm.nameAr.trim()          || null,
          grade:           titleForm.grade.trim()           || null,
          mappingCode:     titleForm.mappingCode.trim()     || null,
          integrationCode: titleForm.integrationCode.trim() || null,
          jobFamilyId:     titleForm.jobFamilyId,
        }),
      })
      const json = await res.json()
      if (!json.ok) { toast.error(json.error ?? tc('error')); return }

      if (editingTitle) {
        setTitles(prev => prev.map(x => x.id === json.data.id ? json.data : x))
        toast.success(t('jobTitleUpdated'))
      } else {
        setTitles(prev => [...prev, json.data])
        toast.success(t('jobTitleCreated'))
      }
      setTitleDialog(false)
    } catch {
      toast.error(tc('error'))
    } finally {
      setSavingTitle(false)
    }
  }

  async function deleteTitle(title: JobTitle) {
    if (title._count.employees > 0) {
      toast.error(t('jobTitleHasEmployees', { count: title._count.employees }))
      return
    }
    if (!confirm(`${tc('confirm')}: delete "${title.name}"?`)) return
    const res  = await fetch(`/api/job-titles/${title.id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!json.ok) { toast.error(json.error ?? tc('error')); return }
    setTitles(prev => prev.filter(x => x.id !== title.id))
    toast.success(t('jobTitleDeleted'))
  }

  async function toggleTitleActive(title: JobTitle) {
    const res  = await fetch(`/api/job-titles/${title.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !title.isActive }),
    })
    const json = await res.json()
    if (!json.ok) { toast.error(json.error ?? tc('error')); return }
    setTitles(prev => prev.map(x => x.id === title.id ? json.data : x))
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
    <div className="p-6 space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('jobTitlesTitle')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('jobTitlesDesc')}</p>
      </div>

      {/* ── SECTION 1: Job Families ─────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <div>
                <CardTitle className="text-base">{t('jobFamiliesTitle')}</CardTitle>
                <CardDescription className="mt-0.5">{t('jobFamiliesDesc')}</CardDescription>
              </div>
            </div>
            <Button size="sm" onClick={openAddFamily}>
              <Plus className="w-4 h-4 mr-1" />
              {t('addJobFamily')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {families.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Briefcase className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">{t('noJobFamilies')}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={openAddFamily}>
                <Plus className="w-4 h-4 mr-1" /> {t('addJobFamily')}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="text-left px-4 py-2">{t('familyName')}</th>
                    <th className="text-left px-4 py-2">{t('arabicName')}</th>
                    <th className="text-left px-4 py-2">{tc('details')}</th>
                    <th className="text-center px-4 py-2">{t('titlesCount')}</th>
                    <th className="text-center px-4 py-2">{tc('status')}</th>
                    <th className="text-right px-4 py-2">{tc('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {families.map(f => (
                    <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium">{f.name}</td>
                      <td className="px-4 py-3 text-gray-500" dir="rtl">{f.nameAr ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{f.description ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary">{f._count.jobTitles}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Switch
                          checked={f.isActive}
                          onCheckedChange={() => toggleFamilyActive(f)}
                          aria-label={f.isActive ? tc('inactive') : tc('active')}
                        />
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditFamily(f)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteFamily(f)}
                          disabled={f._count.jobTitles > 0}
                          title={f._count.jobTitles > 0 ? t('jobFamilyHasTitlesHint') : tc('delete')}
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

      {/* ── SECTION 2: Job Titles ───────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-purple-600" />
              <div>
                <CardTitle className="text-base">{t('jobTitlesListTitle')}</CardTitle>
                <CardDescription className="mt-0.5">{t('jobTitlesListDesc')}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterFamily} onValueChange={(v) => setFilterFamily(v ?? '')}>
                <SelectTrigger className="w-44 h-8 text-xs">
                  <SelectValue placeholder={t('allFamilies')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allFamilies')}</SelectItem>
                  {families.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={openAddTitle} disabled={families.length === 0}>
                <Plus className="w-4 h-4 mr-1" />
                {t('addJobTitle')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTitles.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Tag className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">
                {families.length === 0 ? t('noJobFamiliesFirst') : t('noJobTitles')}
              </p>
              {families.length > 0 && (
                <Button variant="outline" size="sm" className="mt-4" onClick={openAddTitle}>
                  <Plus className="w-4 h-4 mr-1" /> {t('addJobTitle')}
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="text-left px-4 py-2">{t('titleName')}</th>
                    <th className="text-left px-4 py-2">{t('arabicName')}</th>
                    <th className="text-left px-4 py-2">{t('grade')}</th>
                    <th className="text-left px-4 py-2">{t('mappingCode')}</th>
                    <th className="text-left px-4 py-2">{t('integrationCode')}</th>
                    <th className="text-left px-4 py-2">{t('jobFamily')}</th>
                    <th className="text-center px-4 py-2">{tc('employees')}</th>
                    <th className="text-center px-4 py-2">{tc('status')}</th>
                    <th className="text-right px-4 py-2">{tc('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTitles.map(title => (
                    <tr key={title.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium">{title.name}</td>
                      <td className="px-4 py-3 text-gray-500" dir="rtl">{title.nameAr ?? '—'}</td>
                      <td className="px-4 py-3">
                        {title.grade
                          ? <Badge variant="outline" className="text-xs">{title.grade}</Badge>
                          : <span className="text-gray-400">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        {title.mappingCode
                          ? <code className="text-xs bg-gray-100 rounded px-1.5 py-0.5">{title.mappingCode}</code>
                          : <span className="text-gray-400">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        {title.integrationCode
                          ? <code className="text-xs bg-purple-50 text-purple-700 rounded px-1.5 py-0.5">{title.integrationCode}</code>
                          : <span className="text-gray-400">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-xs">
                          {title.jobFamily.name}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary">{title._count.employees}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Switch
                          checked={title.isActive}
                          onCheckedChange={() => toggleTitleActive(title)}
                          aria-label={title.isActive ? tc('inactive') : tc('active')}
                        />
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditTitle(title)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteTitle(title)}
                          disabled={title._count.employees > 0}
                          title={title._count.employees > 0 ? t('jobTitleHasEmployeesHint') : tc('delete')}
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

      {/* ── Job Family Dialog ───────────────────────────────────────────────── */}
      <Dialog open={familyDialog} onOpenChange={setFamilyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingFamily ? t('editJobFamily') : t('addJobFamily')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('familyName')} *</Label>
              <Input
                value={familyForm.name}
                onChange={e => setFamilyForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Engineering, Finance, HR"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('arabicName')}</Label>
              <Input
                value={familyForm.nameAr}
                onChange={e => setFamilyForm(f => ({ ...f, nameAr: e.target.value }))}
                placeholder="e.g. الهندسة"
                dir="rtl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('description')}</Label>
              <Input
                value={familyForm.description}
                onChange={e => setFamilyForm(f => ({ ...f, description: e.target.value }))}
                placeholder={t('descriptionPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFamilyDialog(false)}>{tc('cancel')}</Button>
            <Button onClick={saveFamily} disabled={savingFamily}>
              {savingFamily && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Job Title Dialog ────────────────────────────────────────────────── */}
      <Dialog open={titleDialog} onOpenChange={setTitleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTitle ? t('editJobTitle') : t('addJobTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('jobFamily')} *</Label>
              <Select
                value={titleForm.jobFamilyId}
                onValueChange={v => setTitleForm(f => ({ ...f, jobFamilyId: v ?? '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectJobFamily')} />
                </SelectTrigger>
                <SelectContent>
                  {families.filter(f => f.isActive).map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('titleName')} *</Label>
              <Input
                value={titleForm.name}
                onChange={e => setTitleForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Senior Software Engineer"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('arabicName')}</Label>
              <Input
                value={titleForm.nameAr}
                onChange={e => setTitleForm(f => ({ ...f, nameAr: e.target.value }))}
                placeholder="e.g. مهندس برمجيات أول"
                dir="rtl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('grade')}</Label>
              <Input
                value={titleForm.grade}
                onChange={e => setTitleForm(f => ({ ...f, grade: e.target.value }))}
                placeholder="e.g. L3, Senior, Grade 7"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('mappingCode')}</Label>
              <Input
                value={titleForm.mappingCode}
                onChange={e => setTitleForm(f => ({ ...f, mappingCode: e.target.value }))}
                placeholder={t('mappingCodePlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('integrationCode')}</Label>
              <Input
                value={titleForm.integrationCode}
                onChange={e => setTitleForm(f => ({ ...f, integrationCode: e.target.value }))}
                placeholder={t('integrationCodePlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTitleDialog(false)}>{tc('cancel')}</Button>
            <Button onClick={saveTitle} disabled={savingTitle}>
              {savingTitle && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
