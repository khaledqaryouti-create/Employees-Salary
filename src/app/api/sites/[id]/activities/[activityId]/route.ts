import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'

interface Params { params: Promise<{ id: string; activityId: string }> }

const patchSchema = z.object({
  name:        z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  isActive:    z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId, activityId } = await params

    const activity = await prisma.siteActivity.findFirst({
      where: { id: activityId, process: { siteId, organizationId: orgId } },
    })
    if (!activity) return error('NOT_FOUND', 'Activity not found', 404)

    const body   = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const updated = await prisma.siteActivity.update({
      where: { id: activityId },
      data:  parsed.data,
    })

    return success(updated)
  } catch (err) {
    logger.error('sites.activities.update', { error: err })
    return handlePrismaError(err)
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId, activityId } = await params

    const activity = await prisma.siteActivity.findFirst({
      where: { id: activityId, process: { siteId, organizationId: orgId } },
    })
    if (!activity) return error('NOT_FOUND', 'Activity not found', 404)

    await prisma.siteActivity.delete({ where: { id: activityId } })

    return success({ deleted: true })
  } catch (err) {
    logger.error('sites.activities.delete', { error: err })
    return handlePrismaError(err)
  }
}
