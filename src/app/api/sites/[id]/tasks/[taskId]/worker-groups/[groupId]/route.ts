import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'

interface Params { params: Promise<{ id: string; taskId: string; groupId: string }> }

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId, taskId, groupId } = await params

    const task = await prisma.siteTask.findFirst({
      where: { id: taskId, activity: { process: { siteId, organizationId: orgId } } },
    })
    if (!task) return error('NOT_FOUND', 'Task not found', 404)

    await prisma.taskWorkerGroup.delete({
      where: { taskId_groupId: { taskId, groupId } },
    })

    return success({ deleted: true })
  } catch (err) {
    logger.error('sites.tasks.workerGroups.unlink', { error: err })
    return handlePrismaError(err)
  }
}
