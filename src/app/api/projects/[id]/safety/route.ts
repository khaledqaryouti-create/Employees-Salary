import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const createSafetySchema = z.object({
  title:       z.string().min(1),
  description: z.string().optional(),
  mandatory:   z.boolean().default(true),
})

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: projectId } = await params

    const project = await prisma.project.findFirst({ where: { id: projectId, organizationId: orgId } })
    if (!project) return error('NOT_FOUND', 'Project not found', 404)

    const requirements = await prisma.projectSafetyRequirement.findMany({
      where: { projectId, organizationId: orgId },
      include: { completedBy: { select: { id: true, fullName: true } } },
      orderBy: [{ mandatory: 'desc' }, { createdAt: 'asc' }],
    })
    return success(requirements)
  } catch (err) {
    logger.error('safety.list', { error: err })
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
    const parsed = createSafetySchema.parse(body)

    const requirement = await prisma.projectSafetyRequirement.create({
      data: { ...parsed, projectId, organizationId: orgId, branchId: project.branchId },
    })
    return success(requirement)
  } catch (err) {
    logger.error('safety.create', { error: err })
    return handlePrismaError(err)
  }
}
