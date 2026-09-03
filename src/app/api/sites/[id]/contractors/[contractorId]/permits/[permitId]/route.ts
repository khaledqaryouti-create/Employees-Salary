import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { logActivity } from '@/lib/system-log'

const PERMIT_TYPES = ['GENERAL', 'HOT_WORK', 'CONFINED_SPACE', 'ELECTRICAL', 'HEIGHT', 'EXCAVATION'] as const

const updateSchema = z.object({
  permitType: z.enum(PERMIT_TYPES).optional(),
  permitNumber: z.string().max(100).optional().nullable(),
  issuedDate: z.string().optional(),
  expiryDate: z.string().optional(),
  issuedById: z.string().optional().nullable(),
  workArea: z.string().max(200).optional().nullable(),
  conditions: z.string().max(1000).optional().nullable(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'REVOKED']).optional(),
})

async function findPermit(permitId: string, contractorId: string, orgId: string) {
  const contractor = await prisma.contractor.findFirst({ where: { id: contractorId, organizationId: orgId } })
  if (!contractor) return null
  return prisma.contractorAccessPermit.findFirst({ where: { id: permitId, contractorId } })
}

function computeStatus(expiryDate: Date): string {
  return expiryDate < new Date() ? 'EXPIRED' : 'ACTIVE'
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contractorId: string; permitId: string }> },
) {
  try {
    const { orgId, user } = await getProfileOrRedirect()
    const { contractorId, permitId } = await params

    const permit = await findPermit(permitId, contractorId, orgId)
    if (!permit) return error('NOT_FOUND', 'Permit not found', 404)

    const body: unknown = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const { issuedDate, expiryDate, status, ...rest } = parsed.data
    const newExpiry = expiryDate ? new Date(expiryDate) : permit.expiryDate

    const updated = await prisma.contractorAccessPermit.update({
      where: { id: permitId },
      data: {
        ...rest,
        ...(issuedDate ? { issuedDate: new Date(issuedDate) } : {}),
        ...(expiryDate ? { expiryDate: newExpiry } : {}),
        status: status ?? computeStatus(newExpiry),
      },
    })

    void logActivity(orgId, user.id, user.email ?? null, 'CONTRACTOR_PERMIT_UPDATED',
      { type: 'ContractorAccessPermit', id: permit.id },
      { permitType: permit.permitType, contractorId },
    )

    return success(updated)
  } catch (err) {
    logger.error('contractor-permit-patch', { error: err })
    return handlePrismaError(err)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; contractorId: string; permitId: string }> },
) {
  try {
    const { orgId, user } = await getProfileOrRedirect()
    const { contractorId, permitId } = await params

    const permit = await findPermit(permitId, contractorId, orgId)
    if (!permit) return error('NOT_FOUND', 'Permit not found', 404)

    await prisma.contractorAccessPermit.delete({ where: { id: permitId } })

    void logActivity(orgId, user.id, user.email ?? null, 'CONTRACTOR_PERMIT_DELETED',
      { type: 'ContractorAccessPermit', id: permitId },
      { permitType: permit.permitType, contractorId },
    )

    return success({ deleted: true })
  } catch (err) {
    logger.error('contractor-permit-delete', { error: err })
    return handlePrismaError(err)
  }
}
