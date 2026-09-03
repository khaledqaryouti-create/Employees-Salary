import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const updateSchema = z.object({
  code: z.string().length(2, 'ISO code must be exactly 2 characters').toUpperCase().optional(),
  name: z.string().min(1).optional(),
})

interface Params { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const { id }    = await params
    const existing  = await prisma.country.findUnique({ where: { id } })
    if (!existing) return error('NOT_FOUND', 'Country not found', 404)

    const body   = await request.json() as unknown
    const parsed = updateSchema.parse(body)

    const updated = await prisma.country.update({
      where: { id },
      data:  {
        ...(parsed.code !== undefined ? { code: parsed.code } : {}),
        ...(parsed.name !== undefined ? { name: parsed.name } : {}),
      },
    })
    return success(updated)
  } catch (err) {
    logger.error('countries.update', { error: err })
    return handlePrismaError(err)
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const { id }   = await params
    const existing = await prisma.country.findUnique({
      where:   { id },
      include: { _count: { select: { safetyRequirements: true, projects: true } } },
    })
    if (!existing) return error('NOT_FOUND', 'Country not found', 404)

    const inUse =
      existing._count.safetyRequirements > 0 ||
      existing._count.projects           > 0
    if (inUse) {
      return error(
        'CONFLICT',
        'Cannot delete: country is linked to safety requirements or projects.',
        409,
      )
    }

    await prisma.country.delete({ where: { id } })
    return success({ id })
  } catch (err) {
    logger.error('countries.delete', { error: err })
    return handlePrismaError(err)
  }
}
