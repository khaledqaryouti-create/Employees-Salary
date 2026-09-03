import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'

interface Params { params: Promise<{ id: string; taskId: string }> }

const patchSchema = z.object({
  name:              z.string().min(1).optional(),
  description:       z.string().nullable().optional(),
  normalOp:          z.boolean().optional(),
  setupShutdown:     z.boolean().optional(),
  maintenance:       z.boolean().optional(),
  emergencyRecovery: z.boolean().optional(),
  contractorWork:    z.boolean().optional(),
  isActive:          z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId, taskId } = await params

    const task = await prisma.siteTask.findFirst({
      where: { id: taskId, activity: { process: { siteId, organizationId: orgId } } },
    })
    if (!task) return error('NOT_FOUND', 'Task not found', 404)

    const body   = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const updated = await prisma.siteTask.update({
      where: { id: taskId },
      data:  parsed.data,
    })

    return success(updated)
  } catch (err) {
    logger.error('sites.tasks.update', { error: err })
    return handlePrismaError(err)
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId, taskId } = await params

    const task = await prisma.siteTask.findFirst({
      where: { id: taskId, activity: { process: { siteId, organizationId: orgId } } },
    })
    if (!task) return error('NOT_FOUND', 'Task not found', 404)

    await prisma.siteTask.delete({ where: { id: taskId } })

    return success({ deleted: true })
  } catch (err) {
    logger.error('sites.tasks.delete', { error: err })
    return handlePrismaError(err)
  }
}
