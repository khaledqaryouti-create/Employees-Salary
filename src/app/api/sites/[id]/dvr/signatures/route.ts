import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])
const VALID_ROLES  = new Set(['EMPLOYER', 'RSPP', 'RLS'])

const signSchema = z.object({
  roleType:   z.string().refine((v) => VALID_ROLES.has(v), { message: 'Invalid role type' }),
  signerName: z.string().min(1),
  notes:      z.string().nullable().optional(),
})

interface Params { params: Promise<{ id: string }> }

async function getDvr(siteId: string, orgId: string) {
  return prisma.dvrSetup.findFirst({ where: { siteId, organizationId: orgId } })
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId } = await params

    const dvr = await getDvr(siteId, orgId)
    if (!dvr) return error('NOT_FOUND', 'DVR not found for this site', 404)

    const signatures = await prisma.dvrApprovalSignature.findMany({
      where:   { dvrId: dvr.id },
      orderBy: { signedAt: 'asc' },
    })

    return success(signatures)
  } catch (err) {
    logger.error('dvr.signatures.list', { error: err })
    return handlePrismaError(err)
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const { id: siteId } = await params

    const dvr = await getDvr(siteId, orgId)
    if (!dvr) return error('NOT_FOUND', 'DVR not found for this site', 404)

    if (dvr.status === 'APPROVED_AND_MONITORED') {
      return error('LOCKED', 'DVR is approved and locked. Start a new review cycle to make changes.', 409)
    }

    const body   = await request.json() as unknown
    const parsed = signSchema.parse(body)

    const signature = await prisma.dvrApprovalSignature.upsert({
      where:  { dvrId_roleType: { dvrId: dvr.id, roleType: parsed.roleType } },
      create: {
        dvrId:      dvr.id,
        roleType:   parsed.roleType,
        signerName: parsed.signerName,
        notes:      parsed.notes ?? null,
        signedAt:   new Date(),
      },
      update: {
        signerName: parsed.signerName,
        notes:      parsed.notes ?? null,
        signedAt:   new Date(),
      },
    })

    void logActivity(orgId, profile.id, profile.email, 'DVR_SIGNED',
      { type: 'DVR', id: dvr.id },
      { siteId, roleType: parsed.roleType, signerName: parsed.signerName },
    )
    return success(signature)
  } catch (err) {
    logger.error('dvr.signatures.sign', { error: err })
    return handlePrismaError(err)
  }
}
