import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const createGroupSchema = z.object({
  code:        z.string().min(1),
  name:        z.string().min(1),
  description: z.string().optional(),
})

interface Params { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId } = await params

    const site = await prisma.site.findFirst({ where: { id: siteId, organizationId: orgId } })
    if (!site) return error('NOT_FOUND', 'Site not found', 404)

    const groups = await prisma.homogeneousWorkerGroup.findMany({
      where: { siteId, organizationId: orgId },
      include: {
        members: { include: { employee: { select: { id: true, fullName: true, jobTitle: true } } } },
      },
      orderBy: { code: 'asc' },
    })
    return success(groups)
  } catch (err) {
    logger.error('worker-groups.list', { error: err })
    return handlePrismaError(err)
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId, activeBranchId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)
    const { id: siteId } = await params

    const site = await prisma.site.findFirst({ where: { id: siteId, organizationId: orgId } })
    if (!site) return error('NOT_FOUND', 'Site not found', 404)

    const body   = await request.json() as unknown
    const parsed = createGroupSchema.parse(body)

    const group = await prisma.homogeneousWorkerGroup.create({
      data: {
        organizationId: orgId,
        branchId:       activeBranchId,
        siteId,
        code:           parsed.code,
        name:           parsed.name,
        description:    parsed.description ?? null,
      },
      include: { members: true },
    })

    return success(group)
  } catch (err) {
    logger.error('worker-groups.create', { error: err })
    return handlePrismaError(err)
  }
}
