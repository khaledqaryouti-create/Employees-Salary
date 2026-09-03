import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'

interface Params { params: Promise<{ id: string; activityId: string }> }

const createSchema = z.object({
  name:              z.string().min(1),
  description:       z.string().optional(),
  normalOp:          z.boolean().optional(),
  setupShutdown:     z.boolean().optional(),
  maintenance:       z.boolean().optional(),
  emergencyRecovery: z.boolean().optional(),
  contractorWork:    z.boolean().optional(),
})

export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId, activityId } = await params

    const activity = await prisma.siteActivity.findFirst({
      where: { id: activityId, process: { siteId, organizationId: orgId } },
    })
    if (!activity) return error('NOT_FOUND', 'Activity not found', 404)

    const body   = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const task = await prisma.siteTask.create({
      data: {
        activityId,
        name:              parsed.data.name,
        description:       parsed.data.description ?? null,
        normalOp:          parsed.data.normalOp ?? true,
        setupShutdown:     parsed.data.setupShutdown ?? false,
        maintenance:       parsed.data.maintenance ?? false,
        emergencyRecovery: parsed.data.emergencyRecovery ?? false,
        contractorWork:    parsed.data.contractorWork ?? false,
      },
    })

    return success(task)
  } catch (err) {
    logger.error('sites.tasks.create', { error: err })
    return handlePrismaError(err)
  }
}
