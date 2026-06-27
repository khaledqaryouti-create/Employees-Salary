'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, ChevronRight, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

interface ComponentValue {
  id: string
  amount: number
  isPercentage: boolean
  component: { name: string; type: string }
}

interface SalaryStructure {
  basicSalary: number
  currency: string
  components: ComponentValue[]
}

interface Employee {
  id: string
  employeeNumber: string
  fullName: string
  country: string
  jobTitle: string | null
  orgUnit: { name: string } | null
  employmentType: string
  isActive: boolean
  salaryStructure: SalaryStructure | null
}

function resolveAmount(comp: ComponentValue, basicSalary: number): number {
  return comp.isPercentage ? (basicSalary * comp.amount) / 100 : comp.amount
}

function totalPackage(s: SalaryStructure): number {
  const extras = s.components.reduce((sum, c) => {
    const amt = resolveAmount(c, s.basicSalary)
    return sum + (c.component.type === 'DEDUCTION' ? -amt : amt)
  }, 0)
  return s.basicSalary + extras
}

function earningsTotal(s: SalaryStructure): number {
  return s.components
    .filter((c) => c.component.type !== 'DEDUCTION')
    .reduce((sum, c) => sum + resolveAmount(c, s.basicSalary), 0)
}

function deductionsTotal(s: SalaryStructure): number {
  return s.components
    .filter((c) => c.component.type === 'DEDUCTION')
    .reduce((sum, c) => sum + resolveAmount(c, s.basicSalary), 0)
}

export function FinancialTable({ employees }: { employees: Employee[] }) {
  const router = useRouter()
  const t = useTranslations('employees')
  const tc = useTranslations('common')
  const [search, setSearch] = useState('')

  const filtered = employees.filter((e) =>
    [e.fullName, e.employeeNumber, e.country, e.orgUnit?.name ?? '', e.jobTitle ?? '']
      .some((v) => v.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div>
      {/* Search */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t('searchFinancialPlaceholder')}
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
              <TableHead>{tc('country')}</TableHead>
              <TableHead className="text-right">{t('basicSalary')}</TableHead>
              <TableHead className="text-right">{tc('allowances')}</TableHead>
              <TableHead className="text-right">{tc('deductions')}</TableHead>
              <TableHead className="text-right font-semibold">{tc('netTotal')}</TableHead>
              <TableHead>{tc('currency')}</TableHead>
              <TableHead>{tc('status')}</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((emp) => {
              const s = emp.salaryStructure
              const net = s ? totalPackage(s) : null
              const allowances = s ? earningsTotal(s) : null
              const deductions = s ? deductionsTotal(s) : null

              return (
                <TableRow
                  key={emp.id}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => router.push(`/employees/${emp.id}/financial`)}
                >
                  <TableCell>
                    <p className="font-medium text-gray-900">{emp.fullName}</p>
                    <p className="text-xs text-gray-400">{emp.jobTitle ?? emp.orgUnit?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400 font-mono">#{emp.employeeNumber}</p>
                  </TableCell>
                  <TableCell className="text-sm">{emp.country}</TableCell>

                  {/* Basic salary */}
                  <TableCell className="text-right font-mono text-sm">
                    {s ? formatCurrency(s.basicSalary, s.currency) : (
                      <span className="text-amber-500 flex items-center justify-end gap-1 text-xs">
                        <AlertCircle className="w-3.5 h-3.5" /> {tc('notSet')}
                      </span>
                    )}
                  </TableCell>

                  {/* Allowances */}
                  <TableCell className="text-right font-mono text-sm text-green-700">
                    {allowances !== null && allowances > 0
                      ? `+ ${formatCurrency(allowances, s!.currency)}`
                      : <span className="text-gray-300">—</span>}
                  </TableCell>

                  {/* Deductions */}
                  <TableCell className="text-right font-mono text-sm text-red-600">
                    {deductions !== null && deductions > 0
                      ? `− ${formatCurrency(deductions, s!.currency)}`
                      : <span className="text-gray-300">—</span>}
                  </TableCell>

                  {/* Net */}
                  <TableCell className="text-right">
                    {net !== null ? (
                      <span className="font-bold font-mono text-sm text-gray-900">
                        {formatCurrency(net, s!.currency)}
                      </span>
                    ) : <span className="text-gray-300 text-sm">—</span>}
                  </TableCell>

                  <TableCell className="text-sm text-gray-500">{s?.currency ?? '—'}</TableCell>

                  <TableCell>
                    <Badge className={emp.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-100'}>
                      {emp.isActive ? tc('active') : tc('inactive')}
                    </Badge>
                  </TableCell>

                  <TableCell><ChevronRight className="w-4 h-4 text-gray-300" /></TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile */}
      <div className="md:hidden divide-y divide-gray-100">
        {filtered.map((emp) => {
          const s = emp.salaryStructure
          const net = s ? totalPackage(s) : null
          return (
            <button
              key={emp.id}
              className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between gap-3 min-h-[44px]"
              onClick={() => router.push(`/employees/${emp.id}/financial`)}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 truncate">{emp.fullName}</p>
                <p className="text-xs text-gray-400">#{emp.employeeNumber} · {emp.country}</p>
                <p className="text-xs text-gray-600 font-mono mt-0.5">
                  {net !== null ? `${tc('netTotal')}: ${formatCurrency(net, s!.currency)}` : tc('noSalarySet')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={emp.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-100'}>
                  {emp.isActive ? tc('active') : tc('inactive')}
                </Badge>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </button>
          )
        })}
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
