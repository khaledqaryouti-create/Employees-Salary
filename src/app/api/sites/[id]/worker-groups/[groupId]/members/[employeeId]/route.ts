import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

interface Params { params: Promise<{ id: string; groupId: string; employeeId: string }> }

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)
    const { id: siteId, groupId, employeeId } = await params

    const group = await prisma.homogeneousWorkerGroup.findFirst({
      where: { id: groupId, siteId, organizationId: orgId },
    })
    if (!group) return error('NOT_FOUND', 'Worker group not found', 404)

    const member = await prisma.workerGroupMember.findFirst({ where: { groupId, employeeId } })
    if (!member) return error('NOT_FOUND', 'Member not found in this group', 404)

    await prisma.workerGroupMember.delete({ where: { id: member.id } })
    return success({ deleted: true })
  } catch (err) {
    logger.error('worker-group-members.remove', { error: err })
    return handlePrismaError(err)
  }
}
