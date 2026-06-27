'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/lib/utils/format'
import {
  Search, Plus, Download, Loader2, User,
  Mail, Calendar, Building2, ChevronRight,
  Save, X, ExternalLink, Briefcase,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────

interface SearchEmployee {
  id: string
  employeeNumber: string
  fullName: string
  firstName: string
  secondName: string | null
  thirdName: string | null
  lastName: string
  email: string
  phone: string | null
  nationality: string | null
  country: string
  jobTitle: string | null
  employmentType: string
  joinDate: string
  isActive: boolean
  orgUnitId: string | null
  managerId: string | null
  orgUnit: { name: string } | null
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

type EditData = {
  firstName:      string
  secondName:     string
  thirdName:      string
  lastName:       string
  email:          string
  phone:          string
  nationality:    string
  country:        string
  jobTitle:       string
  employmentType: string
  joinDate:       string
  orgUnitId:      string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: 'SA', name: 'Saudi Arabia' }, { code: 'AE', name: 'UAE' },
  { code: 'KW', name: 'Kuwait' }, { code: 'BH', name: 'Bahrain' },
  { code: 'OM', name: 'Oman' }, { code: 'QA', name: 'Qatar' },
  { code: 'EG', name: 'Egypt' }, { code: 'MA', name: 'Morocco' },
  { code: 'TN', name: 'Tunisia' }, { code: 'IN', name: 'India' },
  { code: 'PH', name: 'Philippines' }, { code: 'IT', name: 'Italy' },
  { code: 'PK', name: 'Pakistan' }, { code: 'BD', name: 'Bangladesh' },
  { code: 'SG', name: 'Singapore' }, { code: 'MY', name: 'Malaysia' },
  { code: 'LY', name: 'Libya' },
]

const EMPLOYMENT_LABELS: Record<string, string> = {
  LOCAL: 'Local', EXPATRIATE: 'Expatriate', CONTRACT: 'Contract', PART_TIME: 'Part-time',
}

const EMPLOYMENT_COLORS: Record<string, string> = {
  LOCAL: 'bg-blue-100 text-blue-700',
  EXPATRIATE: 'bg-purple-100 text-purple-700',
  CONTRACT: 'bg-amber-100 text-amber-700',
  PART_TIME: 'bg-gray-100 text-gray-600',
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildSelections(unitId: string, allUnits: OrgUnitOption[]): Record<number, string> {
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

function toDateInputValue(date: string | null | undefined): string {
  if (!date) return ''
  try { return new Date(date).toISOString().split('T')[0] ?? '' } catch { return '' }
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function PersonalSearch() {
  const [query, setQuery]             = useState('')
  const [results, setResults]         = useState<SearchEmployee[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [selected, setSelected]       = useState<SearchEmployee | null>(null)
  const [saving, setSaving]           = useState(false)
  const [editData, setEditData]       = useState<EditData | null>(null)
  const [selections, setSelections]   = useState<Record<number, string>>({})

  const [orgLevels,     setOrgLevels]     = useState<OrgLevelOption[]>([])
  const [orgUnits,      setOrgUnits]      = useState<OrgUnitOption[]>([])
  const [nationalities, setNationalities] = useState<NationalityOption[]>([])
  const [jobTitles,     setJobTitles]     = useState<JobTitleOption[]>([])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Reference data ─────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/api/org-units').then((r) => r.json()),
      fetch('/api/org-unit-levels').then((r) => r.json()),
      fetch('/api/nationalities?activeOnly=true').then((r) => r.json()),
      fetch('/api/job-titles').then((r) => r.json()),
    ]).then(([units, levels, nats, jts]) => {
      if (Array.isArray(units))   setOrgUnits(units)
      if (Array.isArray(levels))  setOrgLevels(levels)
      if (nats?.ok && nats?.data) setNationalities(nats.data)
      if (jts?.ok && jts?.data)   setJobTitles(jts.data)
    }).catch(() => {/* silently ignore */})
  }, [])

  // ── Debounced search ────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); setHasSearched(false); return }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/employees?search=${encodeURIComponent(query.trim())}&limit=10`)
        const json = await res.json() as { ok: boolean; data?: { data: SearchEmployee[] } }
        setResults(json.ok ? (json.data?.data ?? []) : [])
        setHasSearched(true)
      } catch {
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }, [query])

  // ── Select employee ─────────────────────────────────────────────────────
  const handleSelect = useCallback((emp: SearchEmployee) => {
    setSelected(emp)
    setEditData({
      firstName:      emp.firstName      ?? '',
      secondName:     emp.secondName     ?? '',
      thirdName:      emp.thirdName      ?? '',
      lastName:       emp.lastName       ?? '',
      email:          emp.email          ?? '',
      phone:          emp.phone          ?? '',
      nationality:    emp.nationality    ?? '',
      country:        emp.country        ?? '',
      jobTitle:       emp.jobTitle       ?? '',
      employmentType: emp.employmentType ?? 'LOCAL',
      joinDate:       toDateInputValue(emp.joinDate),
      orgUnitId:      emp.orgUnitId      ?? '',
    })
    setSelections(emp.orgUnitId ? buildSelections(emp.orgUnitId, orgUnits) : {})
  }, [orgUnits])

  // ── Cascading org change ────────────────────────────────────────────────
  const handleLevelChange = useCallback((depth: number, unitId: string) => {
    setSelections((prev) => {
      const next: Record<number, string> = {}
      for (const [d, v] of Object.entries(prev)) {
        if (Number(d) < depth) next[Number(d)] = v
      }
      if (unitId && unitId !== 'none') next[depth] = unitId
      return next
    })
    setEditData((prev) => prev ? { ...prev, orgUnitId: unitId && unitId !== 'none' ? unitId : '' } : prev)
  }, [])

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!selected || !editData) return
    setSaving(true)
    try {
      const payload = {
        ...editData,
        orgUnitId:   editData.orgUnitId   || null,
        phone:       editData.phone       || null,
        nationality: editData.nationality || null,
        jobTitle:    editData.jobTitle    || null,
        secondName:  editData.secondName  || null,
        thirdName:   editData.thirdName   || null,
      }
      const res = await fetch(`/api/employees/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json() as { ok: boolean; message?: string }
      if (!json.ok) { toast.error(json.message ?? 'Failed to save changes'); return }
      toast.success('Employee updated successfully')
      setResults((prev) => prev.map((e) => e.id === selected.id ? { ...e, ...editData } : e))
      setSelected((prev) => prev ? { ...prev, ...editData } : prev)
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }, [selected, editData])

  // ── Cancel ──────────────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    if (!selected) return
    // restore original data from results list
    const original = results.find((e) => e.id === selected.id) ?? selected
    handleSelect(original)
  }, [selected, results, handleSelect])

  const field = (key: keyof EditData) => ({
    value: editData?.[key] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setEditData((prev) => prev ? { ...prev, [key]: e.target.value } : prev),
  })

  // ──────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── PAGE HEADER ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personal Information</h1>
          <p className="text-sm text-gray-500 mt-0.5">Search and edit employee personal details</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/employees/import"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Import
          </Link>
          <Link
            href="/employees/new"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </Link>
        </div>
      </div>

      {/* ── MASTER / DETAIL ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ── LEFT: results list ────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Search bar — lives inside the left panel */}
            <div className="px-4 pt-4 pb-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 animate-spin" />
                )}
                <input
                  type="text"
                  placeholder="Search by name, number…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-9 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:bg-white transition-colors"
                />
              </div>
              {hasSearched && (
                <p className="text-xs text-gray-400 mt-2">
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* no query */}
            {!query && (
              <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                  <Search className="w-6 h-6 text-blue-300" />
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Start searching</p>
                <p className="text-xs text-gray-400">Type a name or employee number</p>
              </div>
            )}

            {/* searching */}
            {query && isSearching && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              </div>
            )}

            {/* no results */}
            {hasSearched && !isSearching && results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <p className="text-sm font-medium text-gray-500">No results found</p>
                <p className="text-xs text-gray-400 mt-1">Try a different name or number</p>
              </div>
            )}

            {/* result cards */}
            {results.length > 0 && (
              <div className="divide-y divide-gray-50">
                {results.map((emp) => {
                  const isActive = selected?.id === emp.id
                  return (
                    <button
                      key={emp.id}
                      onClick={() => handleSelect(emp)}
                      className={`w-full text-left px-4 py-3.5 transition-colors flex items-start gap-3 ${
                        isActive
                          ? 'bg-blue-50 border-l-2 border-blue-500'
                          : 'hover:bg-gray-50 border-l-2 border-transparent'
                      }`}
                    >
                      {/* avatar */}
                      <div className="shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                        {initials(emp.fullName)}
                      </div>
                      {/* info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isActive ? 'text-blue-700' : 'text-gray-900'}`}>
                          {emp.fullName}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">#{emp.employeeNumber}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${emp.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {emp.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {emp.orgUnit && (
                            <span className="text-xs text-gray-400 truncate">{emp.orgUnit.name}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 mt-1 ${isActive ? 'text-blue-400' : 'text-gray-300'}`} />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: detail / edit panel ────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* placeholder when nothing selected */}
            {!selected && (
              <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                  <User className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-base font-semibold text-gray-500 mb-1">No employee selected</h3>
                <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                  Search for an employee on the left and click their name to view and edit personal details.
                </p>
              </div>
            )}

            {/* edit form */}
            {selected && editData && (
              <>
                {/* Employee identity strip */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {initials(selected.fullName)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">{selected.fullName}</span>
                        <span className="text-xs text-gray-400 font-mono">#{selected.employeeNumber}</span>
                        <Badge className={`text-xs px-2 py-0 h-5 ${selected.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {selected.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge className={`text-xs px-2 py-0 h-5 ${EMPLOYMENT_COLORS[selected.employmentType] ?? 'bg-gray-100 text-gray-600'}`}>
                          {EMPLOYMENT_LABELS[selected.employmentType] ?? selected.employmentType}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Mail className="w-3 h-3" />{selected.email}
                        </span>
                        {selected.joinDate && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Calendar className="w-3 h-3" />Joined {formatDate(selected.joinDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/employees/${selected.id}/personal`}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors shrink-0"
                  >
                    Full profile
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                <div className="px-6 py-6 space-y-7">

                  {/* ── Personal Details ─────────────────────────── */}
                  <section>
                    <SectionHeading color="bg-blue-500" label="Personal Details" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <FormField label="First Name" required>
                        <Input {...field('firstName')} />
                      </FormField>
                      <FormField label="Last Name" required>
                        <Input {...field('lastName')} />
                      </FormField>
                      <FormField label="Second Name">
                        <Input {...field('secondName')} />
                      </FormField>
                      <FormField label="Third Name">
                        <Input {...field('thirdName')} />
                      </FormField>
                      <FormField label="Email Address" required>
                        <Input type="email" {...field('email')} />
                      </FormField>
                      <FormField label="Phone Number">
                        <Input type="tel" {...field('phone')} />
                      </FormField>
                    </div>
                  </section>

                  {/* ── Employment ───────────────────────────────── */}
                  <section>
                    <SectionHeading color="bg-indigo-500" label="Employment" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <FormField label="Nationality">
                        <Select
                          value={editData.nationality}
                          onValueChange={(v) => setEditData((p) => p ? { ...p, nationality: v ?? '' } : p)}
                        >
                          <SelectTrigger><SelectValue placeholder="Select nationality" /></SelectTrigger>
                          <SelectContent>
                            {nationalities.map((n) => (
                              <SelectItem key={n.id} value={n.name}>{n.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                      <FormField label="Work Country" required>
                        <Select
                          value={editData.country}
                          onValueChange={(v) => setEditData((p) => p ? { ...p, country: v ?? '' } : p)}
                        >
                          <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map((c) => (
                              <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                      <FormField label="Job Title">
                        <Select
                          value={editData.jobTitle}
                          onValueChange={(v) => setEditData((p) => p ? { ...p, jobTitle: v ?? '' } : p)}
                        >
                          <SelectTrigger><SelectValue placeholder="Select job title" /></SelectTrigger>
                          <SelectContent>
                            {jobTitles.map((jt) => (
                              <SelectItem key={jt.id} value={jt.name}>{jt.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                      <FormField label="Employment Type" required>
                        <Select
                          value={editData.employmentType}
                          onValueChange={(v) => setEditData((p) => p ? { ...p, employmentType: v ?? '' } : p)}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOCAL">Local</SelectItem>
                            <SelectItem value="EXPATRIATE">Expatriate</SelectItem>
                            <SelectItem value="CONTRACT">Contract</SelectItem>
                            <SelectItem value="PART_TIME">Part-time</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormField>
                      <FormField label="Join Date" required>
                        <Input type="date" {...field('joinDate')} />
                      </FormField>
                    </div>
                  </section>

                  {/* ── Company Structure ────────────────────────── */}
                  {orgLevels.length > 0 && (
                    <section>
                      <SectionHeading color="bg-violet-500" label="Company Structure" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
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
                            <FormField key={level.id} label={level.name}>
                              <div className="relative">
                                <Building2
                                  className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none z-10"
                                  style={{ color: level.color ?? '#6b7280' }}
                                />
                                <Select
                                  key={`${level.depth}-${selections[level.depth - 1] ?? 'root'}-${orgUnits.length}`}
                                  value={selections[level.depth] ?? ''}
                                  onValueChange={(v) => handleLevelChange(level.depth, v ?? '')}
                                  disabled={!parentSelected}
                                >
                                  <SelectTrigger className="pl-8">
                                    <SelectValue placeholder={`Select ${level.name}`} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">— None —</SelectItem>
                                    {available.map((u) => (
                                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </FormField>
                          )
                        })}
                      </div>
                    </section>
                  )}

                  {/* ── Actions ──────────────────────────────────── */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <Link
                      href={`/employees/${selected.id}/personal`}
                      className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Briefcase className="w-4 h-4" />
                      Full profile
                    </Link>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancel}
                        disabled={saving}
                      >
                        <X className="w-4 h-4 mr-1.5" />
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700 text-white min-w-[130px]"
                      >
                        {saving
                          ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Saving…</>
                          : <><Save className="w-4 h-4 mr-1.5" />Save Changes</>
                        }
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SectionHeading({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-1 h-5 rounded-full ${color}`} />
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</h3>
    </div>
  )
}

function FormField({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
    </div>
  )
}

