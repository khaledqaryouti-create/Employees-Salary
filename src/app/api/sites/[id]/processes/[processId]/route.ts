import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'

interface Params { params: Promise<{ id: string; processId: string }> }

const patchSchema = z.object({
  name:        z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  isActive:    z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId, processId } = await params

    const proc = await prisma.siteProcess.findFirst({
      where: { id: processId, siteId, organizationId: orgId },
    })
    if (!proc) return error('NOT_FOUND', 'Process not found', 404)

    const body   = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const updated = await prisma.siteProcess.update({
      where: { id: processId },
      data:  parsed.data,
    })

    return success(updated)
  } catch (err) {
    logger.error('sites.processes.update', { error: err })
    return handlePrismaError(err)
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId, processId } = await params

    const proc = await prisma.siteProcess.findFirst({
      where: { id: processId, siteId, organizationId: orgId },
    })
    if (!proc) return error('NOT_FOUND', 'Process not found', 404)

    await prisma.siteProcess.delete({ where: { id: processId } })

    return success({ deleted: true })
  } catch (err) {
    logger.error('sites.processes.delete', { error: err })
    return handlePrismaError(err)
  }
}
