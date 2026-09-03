import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const addMemberSchema = z.object({
  employeeId: z.string().min(1),
})

interface Params { params: Promise<{ id: string; groupId: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)
    const { id: siteId, groupId } = await params

    const group = await prisma.homogeneousWorkerGroup.findFirst({
      where: { id: groupId, siteId, organizationId: orgId },
    })
    if (!group) return error('NOT_FOUND', 'Worker group not found', 404)

    const body   = await request.json() as unknown
    const parsed = addMemberSchema.parse(body)

    const employee = await prisma.employee.findFirst({ where: { id: parsed.employeeId, organizationId: orgId } })
    if (!employee) return error('VALIDATION', 'Selected employee was not found', 400, 'employeeId')

    const member = await prisma.workerGroupMember.create({
      data: { groupId, employeeId: parsed.employeeId },
      include: { employee: { select: { id: true, fullName: true, jobTitle: true } } },
    })

    return success(member)
  } catch (err) {
    logger.error('worker-group-members.add', { error: err })
    return handlePrismaError(err)
  }
}
