import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { logActivity } from '@/lib/system-log'

const updateSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  vatNumber: z.string().max(50).optional().nullable(),
  contactName: z.string().max(100).optional().nullable(),
  contactEmail: z.string().email().optional().or(z.literal('')).nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  workScope: z.string().max(500).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

async function findContractor(contractorId: string, orgId: string) {
  return prisma.contractor.findFirst({ where: { id: contractorId, organizationId: orgId } })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contractorId: string }> },
) {
  try {
    const { orgId, user } = await getProfileOrRedirect()
    const { contractorId } = await params

    const contractor = await findContractor(contractorId, orgId)
    if (!contractor) return error('NOT_FOUND', 'Contractor not found', 404)

    const body: unknown = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const { startDate, endDate, contactEmail, ...rest } = parsed.data

    const updated = await prisma.contractor.update({
      where: { id: contractorId },
      data: {
        ...rest,
        ...(contactEmail !== undefined ? { contactEmail: contactEmail || null } : {}),
        ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
      },
    })

    void logActivity(orgId, user.id, user.email ?? null, 'CONTRACTOR_UPDATED',
      { type: 'Contractor', id: contractor.id },
      { companyName: contractor.companyName },
    )

    return success(updated)
  } catch (err) {
    logger.error('contractors-patch', { error: err })
    return handlePrismaError(err)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; contractorId: string }> },
) {
  try {
    const { orgId, user } = await getProfileOrRedirect()
    const { contractorId } = await params

    const contractor = await findContractor(contractorId, orgId)
    if (!contractor) return error('NOT_FOUND', 'Contractor not found', 404)

    await prisma.contractor.delete({ where: { id: contractorId } })

    void logActivity(orgId, user.id, user.email ?? null, 'CONTRACTOR_DELETED',
      { type: 'Contractor', id: contractor.id },
      { companyName: contractor.companyName },
    )

    return success({ deleted: true })
  } catch (err) {
    logger.error('contractors-delete', { error: err })
    return handlePrismaError(err)
  }
}
