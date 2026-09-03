import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN', 'MANAGER'])

const updateAssignmentSchema = z.object({
  role:          z.string().min(1).optional(),
  allocationPct: z.coerce.number().min(0).max(200).nullable().optional(),
  hoursPerWeek:  z.coerce.number().min(0).nullable().optional(),
  billableRate:  z.coerce.number().nonnegative().nullable().optional(),
  startDate:     z.string().optional(),
  endDate:       z.string().nullable().optional(),
  status:        z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
})

interface Params { params: Promise<{ id: string; assignmentId: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const { id: projectId, assignmentId } = await params
    const existing = await prisma.resourceAssignment.findFirst({
      where: { id: assignmentId, projectId, organizationId: orgId },
    })
    if (!existing) return error('NOT_FOUND', 'Assignment not found', 404)

    const body   = await request.json() as unknown
    const parsed = updateAssignmentSchema.parse(body)

    const assignment = await prisma.resourceAssignment.update({
      where: { id: assignmentId },
      data: {
        ...parsed,
        ...(parsed.startDate && { startDate: new Date(parsed.startDate) }),
        ...(parsed.endDate !== undefined && { endDate: parsed.endDate ? new Date(parsed.endDate) : null }),
      },
    })
    return success(assignment)
  } catch (err) {
    logger.error('assignments.update', { error: err })
    return handlePrismaError(err)
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const { id: projectId, assignmentId } = await params
    const existing = await prisma.resourceAssignment.findFirst({
      where: { id: assignmentId, projectId, organizationId: orgId },
    })
    if (!existing) return error('NOT_FOUND', 'Assignment not found', 404)

    await prisma.resourceAssignment.delete({ where: { id: assignmentId } })
    return success({ id: assignmentId })
  } catch (err) {
    logger.error('assignments.delete', { error: err })
    return handlePrismaError(err)
  }
}
