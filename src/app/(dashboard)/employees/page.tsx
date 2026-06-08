import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { redirect } from 'next/navigation'
import { LinkButton } from '@/components/ui/link-button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Plus, Download } from 'lucide-react'
import { EmployeesTable } from './employees-table'

export default async function EmployeesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  })
  if (!profile?.organizationId) redirect('/auth/login')

  const [employees, totalCount, countByCountry] = await Promise.all([
    prisma.employee.findMany({
      where: { organizationId: profile.organizationId },
      include: { salaryStructure: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.employee.count({
      where: { organizationId: profile.organizationId, isActive: true },
    }),
    prisma.employee.groupBy({
      by: ['country'],
      where: { organizationId: profile.organizationId, isActive: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
  ])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-500 mt-1">{totalCount} active employees</p>
        </div>
        <div className="flex items-center gap-3">
          <LinkButton variant="outline" href="/employees/import">
            <Download className="w-4 h-4 mr-2" />
            Import
          </LinkButton>
          <LinkButton href="/employees/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </LinkButton>
        </div>
      </div>

      {/* Country breakdown */}
      <div className="flex flex-wrap gap-2">
        {countByCountry.map((c) => (
          <Badge key={c.country} variant="secondary" className="text-xs">
            {c.country} · {c._count.id}
          </Badge>
        ))}
      </div>

      {/* Employees table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">All Employees</CardTitle>
          <CardDescription>Click any row to view or edit employee details</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {employees.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No employees yet</p>
              <p className="text-gray-400 text-sm mt-1">Import from Excel or add employees one by one</p>
              <div className="flex items-center justify-center gap-3 mt-6">
                <LinkButton variant="outline" href="/employees/import">Import from Excel</LinkButton>
                <LinkButton href="/employees/new">Add Employee</LinkButton>
              </div>
            </div>
          ) : (
            <EmployeesTable employees={employees} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function EmployeesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}
