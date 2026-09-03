import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'

interface Params { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId } = await params

    const site = await prisma.site.findFirst({ where: { id: siteId, organizationId: orgId } })
    if (!site) return error('NOT_FOUND', 'Site not found', 404)

    const screenings = await prisma.taskHazardScreening.findMany({
      where: {
        isApplicable: true,
        task: { activity: { process: { siteId, organizationId: orgId } } },
      },
      include: {
        task: {
          select: {
            id:   true,
            name: true,
            activity: {
              select: {
                id:   true,
                name: true,
                process: {
                  select: {
                    id:   true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { task: { activity: { process: { name: 'asc' } } } },
        { task: { activity: { name: 'asc' } } },
        { task: { name: 'asc' } },
        { hazardCode: 'asc' },
      ],
    })

    const applicableCount = screenings.length
    const assessedCount   = screenings.filter((s) => s.probability !== null && s.damage !== null).length

    return success({ screenings, applicableCount, assessedCount })
  } catch (err) {
    logger.error('sites.risk-assessment.list', { error: err })
    return handlePrismaError(err)
  }
}
