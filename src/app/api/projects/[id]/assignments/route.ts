import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { getEmployeeAllocationSummary } from '@/lib/projects/allocation-validator'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN', 'MANAGER'])

const createAssignmentSchema = z.object({
  employeeId:    z.string().min(1),
  role:          z.string().min(1),
  allocationPct: z.coerce.number().min(0).max(200).optional(),
  hoursPerWeek:  z.coerce.number().min(0).optional(),
  billableRate:  z.coerce.number().nonnegative().optional(),
  startDate:     z.string().min(1),
  endDate:       z.string().optional(),
  status:        z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).default('APPROVED'),
})

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: projectId } = await params

    const project = await prisma.project.findFirst({ where: { id: projectId, organizationId: orgId } })
    if (!project) return error('NOT_FOUND', 'Project not found', 404)

    const assignments = await prisma.resourceAssignment.findMany({
      where: { projectId, organizationId: orgId },
      include: {
        employee: { select: { id: true, fullName: true, employeeNumber: true, jobTitle: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return success(assignments)
  } catch (err) {
    logger.error('assignments.list', { error: err })
    return handlePrismaError(err)
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const { id: projectId } = await params
    const project = await prisma.project.findFirst({ where: { id: projectId, organizationId: orgId } })
    if (!project) return error('NOT_FOUND', 'Project not found', 404)

    const body   = await request.json() as unknown
    const parsed = createAssignmentSchema.parse(body)

    const fromDate = new Date(parsed.startDate)
    const toDate   = parsed.endDate ? new Date(parsed.endDate) : new Date('2099-12-31')

    const allocationSummary = await getEmployeeAllocationSummary(
      parsed.employeeId, orgId, fromDate, toDate,
    )

    const projectedTotal = allocationSummary.totalPct + (parsed.allocationPct ?? 0)
    const overAllocationWarning = projectedTotal > 100
      ? `Employee will be ${projectedTotal.toFixed(1)}% allocated across projects.`
      : undefined

    const assignment = await prisma.resourceAssignment.create({
      data: {
        ...parsed,
        organizationId: orgId,
        branchId:       project.branchId,
        projectId,
        startDate: fromDate,
        endDate:   parsed.endDate ? new Date(parsed.endDate) : null,
        allocationPct: parsed.allocationPct ?? null,
        hoursPerWeek:  parsed.hoursPerWeek  ?? null,
        billableRate:  parsed.billableRate  ?? null,
      },
      include: { employee: { select: { id: true, fullName: true } } },
    })

    return success({ assignment, overAllocationWarning })
  } catch (err) {
    logger.error('assignments.create', { error: err })
    return handlePrismaError(err)
  }
}
