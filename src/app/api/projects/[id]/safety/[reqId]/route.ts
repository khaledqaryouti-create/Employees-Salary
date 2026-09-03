import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const updateSafetySchema = z.object({
  title:          z.string().min(1).optional(),
  description:    z.string().optional(),
  mandatory:      z.boolean().optional(),
  completedAt:    z.string().nullable().optional(),
  completedById:  z.string().nullable().optional(),
})

interface Params { params: Promise<{ id: string; reqId: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: projectId, reqId } = await params

    const existing = await prisma.projectSafetyRequirement.findFirst({
      where: { id: reqId, projectId, organizationId: orgId },
    })
    if (!existing) return error('NOT_FOUND', 'Safety requirement not found', 404)

    const body   = await request.json() as unknown
    const parsed = updateSafetySchema.parse(body)

    const requirement = await prisma.projectSafetyRequirement.update({
      where: { id: reqId },
      data: {
        ...parsed,
        ...(parsed.completedAt !== undefined && {
          completedAt: parsed.completedAt ? new Date(parsed.completedAt) : null,
        }),
      },
    })
    return success(requirement)
  } catch (err) {
    logger.error('safety.update', { error: err })
    return handlePrismaError(err)
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const { id: projectId, reqId } = await params
    const existing = await prisma.projectSafetyRequirement.findFirst({
      where: { id: reqId, projectId, organizationId: orgId },
    })
    if (!existing) return error('NOT_FOUND', 'Safety requirement not found', 404)

    await prisma.projectSafetyRequirement.delete({ where: { id: reqId } })
    return success({ id: reqId })
  } catch (err) {
    logger.error('safety.delete', { error: err })
    return handlePrismaError(err)
  }
}
