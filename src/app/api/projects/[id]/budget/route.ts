import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const createBudgetLineSchema = z.object({
  category:      z.enum(['LABOR', 'ASSETS', 'OTHER']),
  plannedAmount: z.coerce.number().nonnegative(),
  periodStart:   z.string().min(1),
  periodEnd:     z.string().min(1),
})

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: projectId } = await params

    const project = await prisma.project.findFirst({ where: { id: projectId, organizationId: orgId } })
    if (!project) return error('NOT_FOUND', 'Project not found', 404)

    const lines = await prisma.projectBudgetLine.findMany({
      where: { projectId, organizationId: orgId },
      orderBy: [{ periodStart: 'asc' }, { category: 'asc' }],
    })
    return success(lines)
  } catch (err) {
    logger.error('budget.list', { error: err })
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
    const parsed = createBudgetLineSchema.parse(body)

    const line = await prisma.projectBudgetLine.create({
      data: {
        ...parsed,
        projectId,
        organizationId: orgId,
        branchId:       project.branchId,
        periodStart:    new Date(parsed.periodStart),
        periodEnd:      new Date(parsed.periodEnd),
      },
    })
    return success(line)
  } catch (err) {
    logger.error('budget.create', { error: err })
    return handlePrismaError(err)
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const { id: projectId } = await params
    const { searchParams }  = new URL(request.url)
    const lineId            = searchParams.get('lineId')
    if (!lineId) return error('VALIDATION', 'lineId query parameter is required', 400)

    const existing = await prisma.projectBudgetLine.findFirst({
      where: { id: lineId, projectId, organizationId: orgId },
    })
    if (!existing) return error('NOT_FOUND', 'Budget line not found', 404)

    await prisma.projectBudgetLine.delete({ where: { id: lineId } })
    return success({ id: lineId })
  } catch (err) {
    logger.error('budget.delete', { error: err })
    return handlePrismaError(err)
  }
}
