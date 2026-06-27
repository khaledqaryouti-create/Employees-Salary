import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { prisma } from '@/lib/prisma/client'
import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/link-button'
import { Calculator, Plus } from 'lucide-react'

const TYPE_COLORS: Record<string, string> = {
  EARNING:       'bg-green-100 text-green-700',
  DEDUCTION:     'bg-red-100 text-red-700',
  EMPLOYER_COST: 'bg-blue-100 text-blue-700',
}

export default async function SalaryComponentsPage() {
  const { orgId } = await getProfileOrRedirect()
  const t = await getTranslations('settings')

  const ruleSets = await prisma.countryRuleSet.findMany({
    where: {
      OR: [
        { organizationId: orgId },
        { organizationId: null, isDefault: true },
      ],
    },
    include: {
      rules: {
        where: { isActive: true },
        orderBy: [{ type: 'asc' }, { order: 'asc' }],
      },
    },
    orderBy: { country: 'asc' },
  })

  const allRules = ruleSets.flatMap((rs) =>
    rs.rules.map((r) => ({ ...r, ruleSetName: rs.name, country: rs.country }))
  )

  const grouped = allRules.reduce<Record<string, typeof allRules>>((acc, r) => {
    acc[r.type] = acc[r.type] ?? []
    acc[r.type]!.push(r)
    return acc
  }, {})

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('salaryComponentsTitle')}</h1>
          <p className="text-gray-500 mt-1">{t('salaryComponentsDesc')}</p>
        </div>
        <LinkButton href="/settings/formula-builder">
          <Plus className="w-4 h-4 mr-2" />
          {t('formulaBuilderTitle')}
        </LinkButton>
      </div>

      {(['EARNING', 'DEDUCTION', 'EMPLOYER_COST'] as const).map((type) => {
        const typeLabels: Record<string, string> = {
          EARNING: t('earnings'),
          DEDUCTION: t('deductions'),
          EMPLOYER_COST: t('employerCosts'),
        }
        const typeLabel = typeLabels[type] ?? type
        return (
        <Card key={type}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="w-4 h-4" />
              {typeLabel}
            </CardTitle>
            <CardDescription>{t('activeComponents', { count: grouped[type]?.length ?? 0 })}</CardDescription>
          </CardHeader>
          <CardContent>
            {(grouped[type]?.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-400">{t('noComponents')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 pr-4">{t('compName')}</th>
                      <th className="pb-2 pr-4">{t('compFormula')}</th>
                      <th className="pb-2 pr-4">{t('compCountry')}</th>
                      <th className="pb-2">{t('compType')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {grouped[type]!.map((rule) => (
                      <tr key={rule.id} className="hover:bg-gray-50">
                        <td className="py-2 pr-4 font-medium">{rule.name}</td>
                        <td className="py-2 pr-4 font-mono text-xs text-gray-600 max-w-xs truncate">
                          {rule.formula}
                        </td>
                        <td className="py-2 pr-4 text-gray-500">{rule.ruleSetName}</td>
                        <td className="py-2">
                          <Badge className={`text-xs ${TYPE_COLORS[rule.type] ?? ''}`}>
                            {rule.type}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        )
      })}
    </div>
  )
}
