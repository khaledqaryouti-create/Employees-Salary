import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const updateGroupSchema = z.object({
  code:        z.string().min(1).optional(),
  name:        z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  isActive:    z.boolean().optional(),
})

interface Params { params: Promise<{ id: string; groupId: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)
    const { id: siteId, groupId } = await params

    const existing = await prisma.homogeneousWorkerGroup.findFirst({
      where: { id: groupId, siteId, organizationId: orgId },
    })
    if (!existing) return error('NOT_FOUND', 'Worker group not found', 404)

    const body   = await request.json() as unknown
    const parsed = updateGroupSchema.parse(body)

    const group = await prisma.homogeneousWorkerGroup.update({
      where: { id: groupId },
      data: {
        ...(parsed.code        !== undefined ? { code:        parsed.code }        : {}),
        ...(parsed.name        !== undefined ? { name:        parsed.name }        : {}),
        ...(parsed.description !== undefined ? { description: parsed.description } : {}),
        ...(parsed.isActive    !== undefined ? { isActive:    parsed.isActive }    : {}),
      },
      include: { members: { include: { employee: { select: { id: true, fullName: true, jobTitle: true } } } } },
    })

    return success(group)
  } catch (err) {
    logger.error('worker-groups.update', { error: err })
    return handlePrismaError(err)
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)
    const { id: siteId, groupId } = await params

    const existing = await prisma.homogeneousWorkerGroup.findFirst({
      where: { id: groupId, siteId, organizationId: orgId },
    })
    if (!existing) return error('NOT_FOUND', 'Worker group not found', 404)

    await prisma.homogeneousWorkerGroup.delete({ where: { id: groupId } })
    return success({ deleted: true })
  } catch (err) {
    logger.error('worker-groups.delete', { error: err })
    return handlePrismaError(err)
  }
}
