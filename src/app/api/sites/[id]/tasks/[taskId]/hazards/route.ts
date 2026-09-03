import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'

interface Params { params: Promise<{ id: string; taskId: string }> }

const hazardSchema = z.object({
  hazardCode:    z.string().min(1),
  isApplicable:  z.boolean(),
  justification: z.string().nullable().optional(),
  assessorName:  z.string().nullable().optional(),
})

const bodySchema = z.object({
  screenings: z.array(hazardSchema).min(1),
})

export async function PUT(request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId, taskId } = await params

    const task = await prisma.siteTask.findFirst({
      where: { id: taskId, activity: { process: { siteId, organizationId: orgId } } },
    })
    if (!task) return error('NOT_FOUND', 'Task not found', 404)

    const body   = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const results = await prisma.$transaction(
      parsed.data.screenings.map((s) =>
        prisma.taskHazardScreening.upsert({
          where:  { taskId_hazardCode: { taskId, hazardCode: s.hazardCode } },
          create: {
            taskId,
            hazardCode:    s.hazardCode,
            isApplicable:  s.isApplicable,
            justification: s.justification ?? null,
            assessorName:  s.assessorName ?? null,
          },
          update: {
            isApplicable:  s.isApplicable,
            justification: s.justification ?? null,
            assessorName:  s.assessorName ?? null,
          },
        })
      )
    )

    return success(results)
  } catch (err) {
    logger.error('sites.tasks.hazards.upsert', { error: err })
    return handlePrismaError(err)
  }
}
