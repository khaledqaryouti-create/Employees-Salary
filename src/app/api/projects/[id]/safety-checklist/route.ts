import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    const { orgId }      = await getProfileOrRedirect()
    const { id: projectId } = await params

    const project = await prisma.project.findFirst({ where: { id: projectId, organizationId: orgId } })
    if (!project) return error('NOT_FOUND', 'Project not found', 404)

    const items = await prisma.projectSafetyItem.findMany({
      where: { projectId, organizationId: orgId },
      include: {
        requirement: {
          select: {
            id: true, title: true, description: true, legalReference: true,
            category: true, mandatory: true, recurring: true, recurrenceMonths: true,
            requiredRole: true, requiredDocument: true, triggerCondition: true,
          },
        },
        assignedTo: { select: { id: true, fullName: true } },
      },
      orderBy: [
        { requirement: { category: 'asc' } },
        { requirement: { sortOrder: 'asc' } },
      ],
    })

    const mandatoryTotal    = items.filter((i) => i.requirement.mandatory).length
    const mandatoryComplete = items.filter((i) => i.requirement.mandatory && i.status === 'DONE').length

    return success({ items, mandatoryTotal, mandatoryComplete })
  } catch (err) {
    logger.error('safety-checklist.get', { error: err })
    return handlePrismaError(err)
  }
}
