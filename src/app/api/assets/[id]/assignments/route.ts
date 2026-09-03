import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const createAssignmentSchema = z.object({
  projectId:  z.string().optional(),
  employeeId: z.string().optional(),
  startDate:  z.string().min(1),
  endDate:    z.string().optional(),
})

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: assetId } = await params

    const asset = await prisma.asset.findFirst({ where: { id: assetId, organizationId: orgId } })
    if (!asset) return error('NOT_FOUND', 'Asset not found', 404)

    const assignments = await prisma.assetAssignment.findMany({
      where: { assetId, organizationId: orgId },
      include: {
        project:  { select: { id: true, name: true } },
        employee: { select: { id: true, fullName: true } },
      },
      orderBy: { startDate: 'desc' },
    })
    return success(assignments)
  } catch (err) {
    logger.error('asset-assignments.list', { error: err })
    return handlePrismaError(err)
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const { id: assetId } = await params
    const asset = await prisma.asset.findFirst({ where: { id: assetId, organizationId: orgId } })
    if (!asset) return error('NOT_FOUND', 'Asset not found', 404)

    const body   = await request.json() as unknown
    const parsed = createAssignmentSchema.parse(body)

    if (!parsed.projectId && !parsed.employeeId) {
      return error('VALIDATION', 'Either projectId or employeeId must be provided', 400)
    }

    const assignment = await prisma.assetAssignment.create({
      data: {
        assetId,
        organizationId: orgId,
        projectId:  parsed.projectId  ?? null,
        employeeId: parsed.employeeId ?? null,
        startDate:  new Date(parsed.startDate),
        endDate:    parsed.endDate ? new Date(parsed.endDate) : null,
      },
    })

    // Update asset status to ASSIGNED
    await prisma.asset.update({ where: { id: assetId }, data: { status: 'ASSIGNED' } })

    return success(assignment)
  } catch (err) {
    logger.error('asset-assignments.create', { error: err })
    return handlePrismaError(err)
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const { id: assetId } = await params
    const { searchParams } = new URL(request.url)
    const assignmentId     = searchParams.get('assignmentId')
    if (!assignmentId) return error('VALIDATION', 'assignmentId is required', 400)

    const existing = await prisma.assetAssignment.findFirst({
      where: { id: assignmentId, assetId, organizationId: orgId },
    })
    if (!existing) return error('NOT_FOUND', 'Assignment not found', 404)

    await prisma.assetAssignment.delete({ where: { id: assignmentId } })

    // If no more active assignments, revert status to AVAILABLE
    const remaining = await prisma.assetAssignment.count({
      where: { assetId, endDate: null },
    })
    if (remaining === 0) {
      await prisma.asset.update({ where: { id: assetId }, data: { status: 'AVAILABLE' } })
    }

    return success({ id: assignmentId })
  } catch (err) {
    logger.error('asset-assignments.delete', { error: err })
    return handlePrismaError(err)
  }
}
