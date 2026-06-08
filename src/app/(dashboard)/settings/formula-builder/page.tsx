import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/link-button'
import { Plus, Settings, Copy, Globe } from 'lucide-react'

export default async function FormulaBuilderPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile?.organizationId) redirect('/auth/login')
  if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'].includes(profile.role)) {
    redirect('/dashboard')
  }

  // Load org-specific + global rule sets for this org's countries
  const ruleSets = await prisma.countryRuleSet.findMany({
    where: {
      OR: [
        { organizationId: profile.organizationId },
        { organizationId: null, isDefault: true },
      ],
    },
    include: {
      _count: { select: { rules: true } },
    },
    orderBy: [{ organizationId: 'desc' }, { country: 'asc' }],
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Formula Builder</h1>
          <p className="text-sm text-gray-500 mt-1">
            Edit any payroll calculation rule without writing code
          </p>
        </div>
        <LinkButton href="/settings/formula-builder/new">
          <Plus className="w-4 h-4 mr-2" />
          New Rule Set
        </LinkButton>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Globe className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">How it works</p>
          <p className="mt-1 text-blue-700">
            Each rule set contains formula-based rules for a country. Default rule sets (marked with a globe)
            are pre-seeded with the correct compliance logic. Clone any rule set to customize it for your
            organization — your version takes priority.
          </p>
        </div>
      </div>

      {/* Rule sets grid */}
      {ruleSets.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="text-center py-16">
            <Settings className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No rule sets yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Rule sets will appear here once seed data is loaded
            </p>
            <LinkButton href="/settings/formula-builder/new" className="mt-6">
              Create Rule Set
            </LinkButton>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ruleSets.map((rs) => (
            <Card key={rs.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-semibold truncate">{rs.name}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {rs.country} · {rs.year}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {rs.isDefault && (
                      <Badge variant="secondary" className="text-xs">
                        <Globe className="w-3 h-3 mr-1" />
                        Default
                      </Badge>
                    )}
                    {!rs.isDefault && rs.organizationId && (
                      <Badge className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">
                        Custom
                      </Badge>
                    )}
                    <Badge
                      className={
                        rs.isActive
                          ? 'text-xs bg-green-100 text-green-700 hover:bg-green-100'
                          : 'text-xs bg-gray-100 text-gray-500 hover:bg-gray-100'
                      }
                    >
                      {rs.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-400 mb-4">
                  {rs._count.rules} rule{rs._count.rules !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-2">
                  <LinkButton
                    href={`/settings/formula-builder/${rs.id}`}
                    variant="outline"
                    size="sm"
                    className="flex-1 justify-center"
                  >
                    <Settings className="w-3 h-3 mr-1.5" />
                    Edit Rules
                  </LinkButton>
                  <LinkButton
                    href={`/settings/formula-builder/${rs.id}/clone`}
                    variant="ghost"
                    size="sm"
                    className="px-2"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </LinkButton>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
