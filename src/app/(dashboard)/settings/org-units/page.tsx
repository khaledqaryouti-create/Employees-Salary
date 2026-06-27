import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { getTranslations } from 'next-intl/server'
import OrgUnitsManager from './org-units-manager'

export default async function OrgUnitsPage() {
  const { orgId } = await getProfileOrRedirect()
  const t = await getTranslations('settings')

  const [levels, units] = await Promise.all([
    prisma.orgUnitLevel.findMany({
      where: { organizationId: orgId },
      orderBy: { depth: 'asc' },
    }),
    prisma.orgUnit.findMany({
      where: { organizationId: orgId },
      orderBy: [{ level: { depth: 'asc' } }, { order: 'asc' }, { name: 'asc' }],
      include: {
        level: true,
        parent: { select: { id: true, name: true } },
        _count: { select: { employees: true, children: true } },
      },
    }),
  ])

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('orgUnitsTitle')}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('orgUnitsDesc')}
        </p>
      </div>

      {levels.length === 0 ? (
        <div className="rounded-lg border p-10 text-center text-muted-foreground">
          <p className="font-medium">{t('noLevelsYet')}</p>
          <p className="text-sm mt-1">
            Go to{' '}
            <a href="/settings/org-levels" className="underline text-primary">
              Settings &rsaquo; Org Levels
            </a>{' '}
            to define your hierarchy levels first.
          </p>
        </div>
      ) : (
        <OrgUnitsManager initialUnits={units} levels={levels} />
      )}
    </div>
  )
}
