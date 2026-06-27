import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { getTranslations } from 'next-intl/server'
import OrgLevelsManager from './org-levels-manager'

export default async function OrgLevelsPage() {
  const { orgId } = await getProfileOrRedirect()
  const t = await getTranslations('settings')

  const levels = await prisma.orgUnitLevel.findMany({
    where: { organizationId: orgId },
    orderBy: { depth: 'asc' },
    include: { _count: { select: { units: true } } },
  })

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('orgLevelsTitle')}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('orgLevelsDesc')}
        </p>
      </div>
      <OrgLevelsManager initialLevels={levels} />
    </div>
  )
}
