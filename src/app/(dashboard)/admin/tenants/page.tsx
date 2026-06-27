import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/link-button'
import { Plus, Building2, Users, Globe, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

export default async function TenantsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (profile?.role !== 'SUPER_ADMIN') redirect('/dashboard')

  const organizations = await prisma.organization.findMany({
    include: {
      _count: {
        select: { employees: true, payrollRuns: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Tenants</h1>
          <p className="text-sm text-gray-500 mt-1">{organizations.length} organizations</p>
        </div>
        <LinkButton href="/admin/tenants/new">
          <Plus className="w-4 h-4 mr-2" />
          New Tenant
        </LinkButton>
      </div>

      {organizations.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="text-center py-16">
            <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No organizations yet</p>
            <LinkButton href="/admin/tenants/new" className="mt-6">Create First Tenant</LinkButton>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {organizations.map((org) => (
            <Card key={org.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Logo */}
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                        <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 truncate">{org.name}</p>
                        <Badge variant="secondary" className="text-xs font-mono">{org.slug}</Badge>
                        <Badge
                          className={
                            org.isActive
                              ? 'bg-green-100 text-green-700 hover:bg-green-100 text-xs'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-100 text-xs'
                          }
                        >
                          {org.isActive ? 'Active' : 'Suspended'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 mt-1.5">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Globe className="w-3 h-3" />
                          {org.country ?? 'Multi-country'}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Users className="w-3 h-3" />
                          {org._count.employees} employees
                        </span>
                        <span className="text-xs text-gray-400">
                          {org._count.payrollRuns} payroll runs
                        </span>
                        <span className="text-xs text-gray-400">
                          Since {formatDate(org.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <LinkButton
                      href={`/admin/tenants/${org.id}`}
                      variant="outline"
                      size="sm"
                    >
                      Manage
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </LinkButton>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
