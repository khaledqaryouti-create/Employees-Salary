import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const updateRoleSchema = z.object({
  employeeId:      z.string().nullable().optional(),
  externalName:    z.string().nullable().optional(),
  appointmentDate: z.string().min(1).optional(),
  expiryDate:      z.string().nullable().optional(),
  documentUrl:     z.string().nullable().optional(),
  notes:           z.string().nullable().optional(),
  isActive:        z.boolean().optional(),
})

interface Params { params: Promise<{ id: string; roleId: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)
    const { id: siteId, roleId } = await params

    const existing = await prisma.safetyRoleAppointment.findFirst({
      where: { id: roleId, siteId, organizationId: orgId },
    })
    if (!existing) return error('NOT_FOUND', 'Safety role appointment not found', 404)

    const body   = await request.json() as unknown
    const parsed = updateRoleSchema.parse(body)

    const role = await prisma.safetyRoleAppointment.update({
      where: { id: roleId },
      data: {
        ...(parsed.employeeId      !== undefined ? { employeeId:      parsed.employeeId }                              : {}),
        ...(parsed.externalName    !== undefined ? { externalName:    parsed.externalName }                            : {}),
        ...(parsed.appointmentDate !== undefined ? { appointmentDate: new Date(parsed.appointmentDate) }                : {}),
        ...(parsed.expiryDate      !== undefined ? { expiryDate:      parsed.expiryDate ? new Date(parsed.expiryDate) : null } : {}),
        ...(parsed.documentUrl     !== undefined ? { documentUrl:     parsed.documentUrl }                             : {}),
        ...(parsed.notes           !== undefined ? { notes:           parsed.notes }                                   : {}),
        ...(parsed.isActive        !== undefined ? { isActive:        parsed.isActive }                                : {}),
      },
      include: { employee: { select: { id: true, fullName: true, jobTitle: true } } },
    })

    void logActivity(orgId, profile.id, profile.email, 'SAFETY_ROLE_UPDATED',
      { type: 'SafetyRole', id: roleId },
      { siteId, roleType: existing.roleType },
    )
    return success(role)
  } catch (err) {
    logger.error('safety-roles.update', { error: err })
    return handlePrismaError(err)
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)
    const { id: siteId, roleId } = await params

    const existing = await prisma.safetyRoleAppointment.findFirst({
      where: { id: roleId, siteId, organizationId: orgId },
    })
    if (!existing) return error('NOT_FOUND', 'Safety role appointment not found', 404)

    await prisma.safetyRoleAppointment.delete({ where: { id: roleId } })
    void logActivity(orgId, profile.id, profile.email, 'SAFETY_ROLE_REMOVED',
      { type: 'SafetyRole', id: roleId },
      { siteId, roleType: existing.roleType },
    )
    return success({ deleted: true })
  } catch (err) {
    logger.error('safety-roles.delete', { error: err })
    return handlePrismaError(err)
  }
}
