import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { logActivity } from '@/lib/system-log'

const createSchema = z.object({
  fullName: z.string().min(1).max(200),
  role: z.string().max(100).optional(),
  idNumber: z.string().max(50).optional(),
  inductionDate: z.string().optional().nullable(),
  inductionValid: z.boolean().optional(),
  certifications: z.string().max(1000).optional(),
  notes: z.string().max(500).optional(),
})

async function findContractor(contractorId: string, orgId: string) {
  return prisma.contractor.findFirst({ where: { id: contractorId, organizationId: orgId } })
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

    const workers = await prisma.contractorWorker.findMany({
      where: { contractorId },
      orderBy: { fullName: 'asc' },
    })

    return success(workers)
  } catch (err) {
    logger.error('contractor-workers-get', { error: err })
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

    const { inductionDate, ...rest } = parsed.data

    const worker = await prisma.contractorWorker.create({
      data: {
        ...rest,
        inductionDate: inductionDate ? new Date(inductionDate) : null,
        contractorId,
      },
    })

    void logActivity(orgId, user.id, user.email ?? null, 'CONTRACTOR_WORKER_ADDED',
      { type: 'ContractorWorker', id: worker.id },
      { fullName: worker.fullName, contractorId },
    )

    return success(worker)
  } catch (err) {
    logger.error('contractor-workers-post', { error: err })
    return handlePrismaError(err)
  }
}
