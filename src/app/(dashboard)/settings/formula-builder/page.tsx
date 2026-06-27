import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { prisma } from '@/lib/prisma/client'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/link-button'
import { Plus, Settings, Copy, Globe } from 'lucide-react'

export default async function FormulaBuilderPage() {
  const { profile, orgId } = await getProfileOrRedirect()
  if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'].includes(profile.role)) {
    redirect('/dashboard')
  }
  const t = await getTranslations('settings')

  const ruleSets = await prisma.countryRuleSet.findMany({
    where: {
      OR: [
        { organizationId: orgId },
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
          <h1 className="text-2xl font-bold text-gray-900">{t('formulaBuilderTitle')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('formulaBuilderDesc')}
          </p>
        </div>
        <LinkButton href="/settings/formula-builder/new">
          <Plus className="w-4 h-4 mr-2" />
          {t('newRuleSet')}
        </LinkButton>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Globe className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">{t('howItWorks')}</p>
          <p className="mt-1 text-blue-700">
            {t('howItWorksDesc')}
          </p>
        </div>
      </div>

      {/* Rule sets grid */}
      {ruleSets.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="text-center py-16">
            <Settings className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">{t('noRuleSetsYet')}</p>
            <p className="text-gray-400 text-sm mt-1">
              {t('noRuleSetsYetDesc')}
            </p>
            <LinkButton href="/settings/formula-builder/new" className="mt-6">
              {t('createRuleSet')}
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
                        {t('default')}
                      </Badge>
                    )}
                    {!rs.isDefault && rs.organizationId && (
                      <Badge className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">
                        {t('custom')}
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
                  {rs._count.rules} rule{rs._count.rules === 1 ? '' : 's'}
                </p>
                <div className="flex items-center gap-2">
                  <LinkButton
                    href={`/settings/formula-builder/${rs.id}`}
                    variant="outline"
                    size="sm"
                    className="flex-1 justify-center"
                  >
                    <Settings className="w-3 h-3 mr-1.5" />
                    {t('editRules')}
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
