'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  Plus, Search, FolderKanban, Users, ShieldCheck,
  Calendar, DollarSign, Loader2,
} from 'lucide-react'

type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'

interface Project {
  id: string
  code: string
  name: string
  clientName: string | null
  status: ProjectStatus
  startDate: string
  endDate: string | null
  budgetAmount: string | null
  currency: string
  billable: boolean
  manager: { id: string; fullName: string } | null
  _count: { resourceAssignments: number; safetyRequirements: number }
}

const STATUS_COLOR: Record<ProjectStatus, string> = {
  PLANNING:  'bg-gray-100 text-gray-700',
  ACTIVE:    'bg-green-100 text-green-700',
  ON_HOLD:   'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

const STATUSES: ProjectStatus[] = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']

export default function ProjectsPage() {
  const t = useTranslations('projects')

  const [projects, setProjects]   = useState<Project[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage]           = useState(1)
  const limit = 20

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search)       params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res  = await fetch(`/api/projects?${params.toString()}`)
      const json = await res.json() as { ok: boolean; data: { data: Project[]; total: number } }
      if (json.ok) {
        setProjects(json.data.data)
        setTotal(json.data.total)
      }
    } catch {
      toast.error(t('errorLoading'))
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, t])

  useEffect(() => { void fetchProjects() }, [fetchProjects])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderKanban className="w-7 h-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-sm text-gray-500">{t('subtitle')}</p>
          </div>
        </div>
        <Link href="/projects/new">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t('newProject')}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{t('allStatuses')}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{t(`status.${s}`)}</option>
          ))}
        </select>
      </div>

      {/* Project list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t('noProjects')}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 font-mono">{project.code}</p>
                      <CardTitle className="text-base truncate">{project.name}</CardTitle>
                      {project.clientName && (
                        <p className="text-sm text-gray-500 truncate">{project.clientName}</p>
                      )}
                    </div>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[project.status]}`}>
                      {t(`status.${project.status}`)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {project._count.resourceAssignments}
                    </span>
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {project._count.safetyRequirements}
                    </span>
                    {project.budgetAmount && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        {Number(project.budgetAmount).toLocaleString()} {project.currency}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(project.startDate).toLocaleDateString()}
                    {project.endDate && ` — ${new Date(project.endDate).toLocaleDateString()}`}
                  </div>
                  {project.manager && (
                    <p className="text-xs text-gray-500">{t('pm')}: {project.manager.fullName}</p>
                  )}
                  {project.billable && (
                    <Badge variant="outline" className="text-xs">{t('billable')}</Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{t('showing', { from: (page - 1) * limit + 1, to: Math.min(page * limit, total), total })}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              {t('prev')}
            </Button>
            <Button variant="outline" size="sm" disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}>
              {t('next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
