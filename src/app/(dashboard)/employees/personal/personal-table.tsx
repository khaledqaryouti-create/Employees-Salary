'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

interface Employee {
  id: string
  employeeNumber: string
  fullName: string
  email: string
  phone: string | null
  nationality: string | null
  country: string
  jobTitle: string | null
  employmentType: string
  joinDate: Date
  isActive: boolean
  orgUnit?: { name: string; level: { name: string; color: string | null } } | null
}

export function PersonalTable({ employees }: Readonly<{ employees: Employee[] }>) {
  const router = useRouter()
  const t = useTranslations('employees')
  const tc = useTranslations('common')
  const [search, setSearch] = useState('')

  const employmentLabels: Record<string, string> = {
    LOCAL: t('local'),
    EXPATRIATE: t('expatriate'),
    CONTRACT: t('contract'),
    PART_TIME: t('partTime'),
  }

  const filtered = employees.filter((e) =>
    [e.fullName, e.email, e.employeeNumber, e.orgUnit?.name ?? '', e.country, e.nationality ?? '', e.jobTitle ?? '']
      .some((v) => v.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div>
      {/* Search */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tc('employees')}</TableHead>
              <TableHead>{tc('phone')}</TableHead>
              <TableHead>{t('nationality')}</TableHead>
              <TableHead>{t('workCountry')}</TableHead>
              <TableHead>{t('orgUnit')}</TableHead>
              <TableHead>{t('employmentType')}</TableHead>
              <TableHead>{t('joinDate')}</TableHead>
              <TableHead>{tc('status')}</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((emp) => (
              <TableRow
                key={emp.id}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => router.push(`/employees/${emp.id}/personal`)}
              >
                <TableCell>
                  <p className="font-medium text-gray-900">{emp.fullName}</p>
                  <p className="text-xs text-gray-400">{emp.email}</p>
                  <p className="text-xs text-gray-400 font-mono">#{emp.employeeNumber}</p>
                </TableCell>
                <TableCell className="text-sm text-gray-600">{emp.phone ?? '—'}</TableCell>
                <TableCell className="text-sm text-gray-600">{emp.nationality ?? '—'}</TableCell>
                <TableCell className="text-sm">{emp.country}</TableCell>
                <TableCell>
                  {emp.orgUnit ? (
                    <span className="flex items-center gap-1.5 text-xs">
                      <span
                        className="inline-block w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: emp.orgUnit.level.color ?? '#6b7280' }}
                      />
                      <span className="text-gray-500">{emp.orgUnit.level.name}:</span>
                      <span className="font-medium text-gray-700">{emp.orgUnit.name}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {employmentLabels[emp.employmentType] ?? emp.employmentType}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-600">{formatDate(emp.joinDate)}</TableCell>
                <TableCell>
                  <Badge className={emp.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-100'}>
                    {emp.isActive ? tc('active') : tc('inactive')}
                  </Badge>
                </TableCell>
                <TableCell><ChevronRight className="w-4 h-4 text-gray-300" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile */}
      <div className="md:hidden divide-y divide-gray-100">
        {filtered.map((emp) => (
          <button
            key={emp.id}
            className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between gap-3 min-h-[44px]"
            onClick={() => router.push(`/employees/${emp.id}/personal`)}
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 truncate">{emp.fullName}</p>
              <p className="text-xs text-gray-400">{emp.country} · {emp.orgUnit?.name ?? tc('noDept')}</p>
              <p className="text-xs text-gray-500">{emp.nationality ?? '—'} · {tc('joined')} {formatDate(emp.joinDate)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={emp.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-100'}>
                {emp.isActive ? tc('active') : tc('inactive')}
              </Badge>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm">{t('noSearchResults')}</div>
      )}

      <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400">
        {tc('showing', { count: filtered.length, total: employees.length })}
      </div>
    </div>
  )
}
