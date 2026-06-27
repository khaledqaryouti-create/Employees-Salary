import Link from 'next/link'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { prisma } from '@/lib/prisma/client'
import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Globe, Percent } from 'lucide-react'

const COUNTRY_NAMES: Record<string, string> = {
  SA: 'Saudi Arabia', AE: 'UAE', KW: 'Kuwait', BH: 'Bahrain', OM: 'Oman', QA: 'Qatar',
  EG: 'Egypt', MA: 'Morocco', TN: 'Tunisia', LY: 'Libya',
  IN: 'India', PH: 'Philippines', PK: 'Pakistan', BD: 'Bangladesh',
  IT: 'Italy',
}

export default async function TaxTablesPage() {
  const { orgId } = await getProfileOrRedirect()
  const t = await getTranslations('settings')

  const org = await prisma.organization.findUnique({ where: { id: orgId } })

  const ruleSets = await prisma.countryRuleSet.findMany({
    where: {
      OR: [
        { organizationId: orgId },
        { organizationId: null, isDefault: true },
      ],
      isActive: true,
    },
    include: {
      _count: { select: { rules: true } },
    },
    orderBy: { country: 'asc' },
  })

  const taxBrackets = await prisma.taxBracket.findMany({
    where: { organizationId: orgId },
    orderBy: [{ country: 'asc' }, { fromAmount: 'asc' }],
  })

  const bracketsByCountry = taxBrackets.reduce<Record<string, typeof taxBrackets>>((acc, b) => {
    acc[b.country] = acc[b.country] ?? []
    acc[b.country]!.push(b)
    return acc
  }, {})

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('taxTablesTitle')}</h1>
          <p className="text-gray-500 mt-1">
            Tax brackets and rates for {org?.name ?? 'your organization'} — read-only view.{' '}
            Edit formulas in{' '}
            <Link href="/settings/formula-builder" className="text-blue-600 hover:underline">
              {t('formulaBuilderTitle')}
            </Link>.
          </p>
        </div>
      </div>

      {/* Active Country Rule Sets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            {t('activeRuleSets')}
          </CardTitle>
          <CardDescription>{t('activeRuleSetsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ruleSets.map((rs) => (
              <div key={rs.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                <div>
                  <p className="font-medium text-sm">{rs.name}</p>
                  <p className="text-xs text-gray-500">{COUNTRY_NAMES[rs.country] ?? rs.country} · {rs.year}</p>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="text-xs">{rs._count.rules} {t('rules')}</Badge>
                  {rs.organizationId ? (
                    <p className="text-xs text-blue-600 mt-1">{t('custom')}</p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">{t('default')}</p>
                  )}
                </div>
              </div>
            ))}
            {ruleSets.length === 0 && (
              <p className="text-gray-400 text-sm col-span-3">{t('noRuleSets')}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tax Brackets */}
      {Object.entries(bracketsByCountry).map(([country, brackets]) => (
        <Card key={country}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Percent className="w-4 h-4 text-green-600" />
              {COUNTRY_NAMES[country] ?? country} — {t('incomeTaxBrackets')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">{t('from')}</th>
                    <th className="pb-2 pr-4">{t('to')}</th>
                    <th className="pb-2 pr-4">{t('rate')}</th>
                    <th className="pb-2 pr-4">{t('fixedAmount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {brackets.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="py-2 pr-4 font-mono">{b.fromAmount.toLocaleString()}</td>
                      <td className="py-2 pr-4 font-mono">
                        {b.toAmount ? b.toAmount.toLocaleString() : <span className="text-gray-400">∞</span>}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="font-mono">{b.rate}%</Badge>
                      </td>
                      <td className="py-2 pr-4 font-mono">{b.fixedAmount?.toLocaleString() ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      {Object.keys(bracketsByCountry).length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            {t('noTaxBrackets')}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
