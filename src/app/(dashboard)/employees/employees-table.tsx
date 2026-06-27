'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import type { Prisma } from '@prisma/client'

type EmployeeWithSalary = Prisma.EmployeeGetPayload<{
  include: { salaryStructure: true; orgUnit: { select: { name: true } } }
}>

interface EmployeesTableProps {
  readonly employees: EmployeeWithSalary[]
}

export function EmployeesTable({ employees }: EmployeesTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filtered = employees.filter((e) =>
    e.fullName.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase()) ||
    e.employeeNumber.toLowerCase().includes(search.toLowerCase()) ||
    (e.orgUnit?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    e.country.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Search bar */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, country…"
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
              <TableHead>Employee</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Basic Salary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((employee) => (
              <TableRow
                key={employee.id}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => router.push(`/employees/${employee.id}`)}
              >
                <TableCell>
                  <div>
                    <p className="font-medium text-gray-900">{employee.fullName}</p>
                    <p className="text-xs text-gray-400">{employee.email}</p>
                    <p className="text-xs text-gray-400">#{employee.employeeNumber}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{employee.country}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-600">{employee.orgUnit?.name ?? '—'}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {employee.employmentType.replaceAll('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm font-medium">
                    {employee.salaryStructure
                      ? formatCurrency(
                          employee.salaryStructure.basicSalary,
                          employee.salaryStructure.currency
                        )
                      : '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      employee.isActive
                        ? 'bg-green-100 text-green-700 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-100'
                    }
                  >
                    {employee.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden divide-y divide-gray-100">
        {filtered.map((employee) => (
          <button
            key={employee.id}
            className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between gap-3 min-h-[44px]"
            onClick={() => router.push(`/employees/${employee.id}`)}
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 truncate">{employee.fullName}</p>
              <p className="text-xs text-gray-400 truncate">{employee.country} · {employee.orgUnit?.name ?? 'No department'}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {employee.salaryStructure
                  ? formatCurrency(employee.salaryStructure.basicSalary, employee.salaryStructure.currency)
                  : 'No salary'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                className={
                  employee.isActive
                    ? 'bg-green-100 text-green-700 hover:bg-green-100'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-100'
                }
              >
                {employee.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm">
          No employees match your search.
        </div>
      )}

      <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400">
        Showing {filtered.length} of {employees.length} employees
      </div>
    </div>
  )
}
