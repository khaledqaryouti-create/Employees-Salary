import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { redirect, notFound } from 'next/navigation'
import { LinkButton } from '@/components/ui/link-button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import { FormulaRulesList } from './formula-rules-list'

export default async function FormulaRuleSetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'].includes(profile?.role ?? '')) {
    redirect('/dashboard')
  }

  const ruleSet = await prisma.countryRuleSet.findUnique({
    where: { id },
    include: {
      rules: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!ruleSet) notFound()

  // Load available formula variables
  const variables = await prisma.formulaVariable.findMany({
    where: {
      OR: [
        { organizationId: profile?.organizationId },
        { isSystem: true },
      ],
    },
    orderBy: { key: 'asc' },
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4">
        <LinkButton variant="ghost" href="/settings/formula-builder" size="sm">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </LinkButton>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{ruleSet.name}</h1>
            {ruleSet.isDefault && (
              <Badge variant="secondary">Default</Badge>
            )}
            <Badge className={ruleSet.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
              {ruleSet.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {ruleSet.country} · {ruleSet.year} · {ruleSet.rules.length} rules
          </p>
        </div>
      </div>

      <FormulaRulesList
        ruleSetId={ruleSet.id}
        rules={ruleSet.rules}
        variables={variables}
        isDefault={ruleSet.isDefault}
        organizationId={profile?.organizationId ?? null}
        ruleSetOrgId={ruleSet.organizationId}
      />
    </div>
  )
}
