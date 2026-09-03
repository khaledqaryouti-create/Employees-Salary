import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { generateChecklist } from '@/lib/projects/safety-checklist-generator'

interface Params { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Params) {
  try {
    const { orgId }      = await getProfileOrRedirect()
    const { id: projectId } = await params

    const project = await prisma.project.findFirst({ where: { id: projectId, organizationId: orgId } })
    if (!project) return error('NOT_FOUND', 'Project not found', 404)

    if (!project.projectType || !project.countryId) {
      return error('INVALID_STATE', 'Project must have projectType and countryId set to generate a checklist', 400)
    }

    const result = await generateChecklist(
      projectId,
      orgId,
      project.branchId,
      {
        projectType:           project.projectType,
        countryId:             project.countryId,
        hasElectricalWorks:    project.hasElectricalWorks,
        hasMultipleContractors: project.hasMultipleContractors,
      },
      project.startDate,
      project.managerId ?? null,
    )

    if (result.created === 0 && result.updated === 0) {
      const existingCount = await prisma.projectSafetyItem.count({ where: { projectId } })
      if (existingCount === 0) {
        return error(
          'NO_MATCHING_REQUIREMENTS',
          'No matching safety requirements found for this country and project type. Make sure the project country is set to Italy and Safety Requirements have been seeded (Settings → Safety Requirements).',
          400,
        )
      }
    }

    return success(result)
  } catch (err) {
    logger.error('safety-checklist.generate', { error: err })
    return handlePrismaError(err)
  }
}
