import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const updateSchema = z.object({
  projectTypes:     z.array(z.enum(['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE', 'ELECTRICAL_INFRASTRUCTURE', 'DATA_CENTER', 'OTHER'])).optional(),
  category:         z.enum(['GENERAL_OHS', 'CONSTRUCTION_SITE', 'FIRE_SAFETY', 'ELECTRICAL_SAFETY', 'SPECIALIZED_RISK', 'ENVIRONMENTAL']).optional(),
  title:            z.string().min(1).optional(),
  description:      z.string().min(1).optional(),
  legalReference:   z.string().min(1).optional(),
  triggerCondition: z.string().nullable().optional(),
  requiredRole:     z.string().nullable().optional(),
  requiredDocument: z.string().nullable().optional(),
  mandatory:        z.boolean().optional(),
  recurring:        z.boolean().optional(),
  recurrenceMonths: z.coerce.number().int().positive().nullable().optional(),
  sortOrder:        z.coerce.number().int().optional(),
  active:           z.boolean().optional(),
})

interface Params { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const { id }  = await params
    const existing = await prisma.safetyRequirement.findUnique({ where: { id } })
    if (!existing) return error('NOT_FOUND', 'Safety requirement not found', 404)

    const body   = await request.json() as unknown
    const parsed = updateSchema.parse(body)

    const data: Record<string, unknown> = {}
    const directFields = ['projectTypes', 'category', 'title', 'description', 'legalReference', 'mandatory', 'recurring', 'sortOrder', 'active'] as const
    for (const key of directFields) {
      if (parsed[key] !== undefined) data[key] = parsed[key]
    }
    const nullableFields = ['triggerCondition', 'requiredRole', 'requiredDocument', 'recurrenceMonths'] as const
    for (const key of nullableFields) {
      if (parsed[key] !== undefined) data[key] = parsed[key] ?? null
    }

    const updated = await prisma.safetyRequirement.update({ where: { id }, data })
    return success(updated)
  } catch (err) {
    logger.error('safety-requirements.update', { error: err })
    return handlePrismaError(err)
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const { id } = await params
    const existing = await prisma.safetyRequirement.findUnique({ where: { id } })
    if (!existing) return error('NOT_FOUND', 'Safety requirement not found', 404)

    // Soft-delete: mark inactive rather than hard delete (preserves history)
    const updated = await prisma.safetyRequirement.update({
      where: { id },
      data:  { active: false },
    })
    return success(updated)
  } catch (err) {
    logger.error('safety-requirements.delete', { error: err })
    return handlePrismaError(err)
  }
}
