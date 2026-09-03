import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { getProjectCostReconciliation } from '@/lib/projects/reconciliation'

interface Params { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: projectId } = await params
    const { searchParams }  = new URL(request.url)

    const project = await prisma.project.findFirst({ where: { id: projectId, organizationId: orgId } })
    if (!project) return error('NOT_FOUND', 'Project not found', 404)

    const distributions = await prisma.costDistribution.findMany({
      where: { projectId, organizationId: orgId },
      include: { employee: { select: { id: true, fullName: true } } },
      orderBy: { periodStart: 'desc' },
    })

    // Optional reconciliation for a specific period
    const periodStart = searchParams.get('periodStart')
    const periodEnd   = searchParams.get('periodEnd')
    let reconciliation = null
    if (periodStart && periodEnd) {
      reconciliation = await getProjectCostReconciliation(
        orgId,
        new Date(periodStart),
        new Date(periodEnd),
      )
    }

    return success({ distributions, reconciliation })
  } catch (err) {
    logger.error('costs.get', { error: err })
    return handlePrismaError(err)
  }
}
