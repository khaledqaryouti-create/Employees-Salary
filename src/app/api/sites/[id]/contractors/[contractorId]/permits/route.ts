import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { logActivity } from '@/lib/system-log'

const PERMIT_TYPES = ['GENERAL', 'HOT_WORK', 'CONFINED_SPACE', 'ELECTRICAL', 'HEIGHT', 'EXCAVATION'] as const

const createSchema = z.object({
  permitType: z.enum(PERMIT_TYPES),
  permitNumber: z.string().max(100).optional(),
  issuedDate: z.string(),
  expiryDate: z.string(),
  issuedById: z.string().optional().nullable(),
  workArea: z.string().max(200).optional(),
  conditions: z.string().max(1000).optional(),
})

async function findContractor(contractorId: string, orgId: string) {
  return prisma.contractor.findFirst({ where: { id: contractorId, organizationId: orgId } })
}

function computeStatus(expiryDate: Date): string {
  return expiryDate < new Date() ? 'EXPIRED' : 'ACTIVE'
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; contractorId: string }> },
) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { contractorId } = await params

    const contractor = await findContractor(contractorId, orgId)
    if (!contractor) return error('NOT_FOUND', 'Contractor not found', 404)

    const permits = await prisma.contractorAccessPermit.findMany({
      where: { contractorId },
      orderBy: { expiryDate: 'asc' },
    })

    return success(permits)
  } catch (err) {
    logger.error('contractor-permits-get', { error: err })
    return handlePrismaError(err)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contractorId: string }> },
) {
  try {
    const { orgId, user } = await getProfileOrRedirect()
    const { contractorId } = await params

    const contractor = await findContractor(contractorId, orgId)
    if (!contractor) return error('NOT_FOUND', 'Contractor not found', 404)

    const body: unknown = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const { issuedDate, expiryDate, ...rest } = parsed.data
    const expiry = new Date(expiryDate)

    const permit = await prisma.contractorAccessPermit.create({
      data: {
        ...rest,
        issuedDate: new Date(issuedDate),
        expiryDate: expiry,
        status: computeStatus(expiry),
        contractorId,
      },
    })

    void logActivity(orgId, user.id, user.email ?? null, 'CONTRACTOR_PERMIT_CREATED',
      { type: 'ContractorAccessPermit', id: permit.id },
      { permitType: permit.permitType, contractorId },
    )

    return success(permit)
  } catch (err) {
    logger.error('contractor-permits-post', { error: err })
    return handlePrismaError(err)
  }
}
