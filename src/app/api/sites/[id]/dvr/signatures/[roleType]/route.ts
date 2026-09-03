import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

interface Params { params: Promise<{ id: string; roleType: string }> }

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const { id: siteId, roleType } = await params

    const dvr = await prisma.dvrSetup.findFirst({ where: { siteId, organizationId: orgId } })
    if (!dvr) return error('NOT_FOUND', 'DVR not found for this site', 404)

    if (dvr.status === 'APPROVED_AND_MONITORED') {
      return error('LOCKED', 'DVR is approved and locked. Start a new review cycle to make changes.', 409)
    }

    const sig = await prisma.dvrApprovalSignature.findUnique({
      where: { dvrId_roleType: { dvrId: dvr.id, roleType } },
    })
    if (!sig) return error('NOT_FOUND', 'Signature not found', 404)

    await prisma.dvrApprovalSignature.delete({ where: { dvrId_roleType: { dvrId: dvr.id, roleType } } })

    return success({ deleted: true })
  } catch (err) {
    logger.error('dvr.signatures.delete', { error: err })
    return handlePrismaError(err)
  }
}
