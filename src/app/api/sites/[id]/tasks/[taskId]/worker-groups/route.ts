import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'

interface Params { params: Promise<{ id: string; taskId: string }> }

const createSchema = z.object({ groupId: z.string().min(1) })

export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId, taskId } = await params

    const task = await prisma.siteTask.findFirst({
      where: { id: taskId, activity: { process: { siteId, organizationId: orgId } } },
    })
    if (!task) return error('NOT_FOUND', 'Task not found', 404)

    const body   = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const group = await prisma.homogeneousWorkerGroup.findFirst({
      where: { id: parsed.data.groupId, siteId, organizationId: orgId },
    })
    if (!group) return error('NOT_FOUND', 'Worker group not found', 404)

    await prisma.taskWorkerGroup.upsert({
      where:  { taskId_groupId: { taskId, groupId: parsed.data.groupId } },
      create: { taskId, groupId: parsed.data.groupId },
      update: {},
    })

    return success({ taskId, groupId: parsed.data.groupId })
  } catch (err) {
    logger.error('sites.tasks.workerGroups.link', { error: err })
    return handlePrismaError(err)
  }
}
