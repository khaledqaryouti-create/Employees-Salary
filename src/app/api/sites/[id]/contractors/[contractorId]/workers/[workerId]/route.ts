import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { logActivity } from '@/lib/system-log'

const updateSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  role: z.string().max(100).optional().nullable(),
  idNumber: z.string().max(50).optional().nullable(),
  inductionDate: z.string().optional().nullable(),
  inductionValid: z.boolean().optional(),
  certifications: z.string().max(1000).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

async function findWorker(workerId: string, contractorId: string, orgId: string) {
  const contractor = await prisma.contractor.findFirst({ where: { id: contractorId, organizationId: orgId } })
  if (!contractor) return null
  return prisma.contractorWorker.findFirst({ where: { id: workerId, contractorId } })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contractorId: string; workerId: string }> },
) {
  try {
    const { orgId, user } = await getProfileOrRedirect()
    const { contractorId, workerId } = await params

    const worker = await findWorker(workerId, contractorId, orgId)
    if (!worker) return error('NOT_FOUND', 'Worker not found', 404)

    const body: unknown = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const { inductionDate, ...rest } = parsed.data

    const updated = await prisma.contractorWorker.update({
      where: { id: workerId },
      data: {
        ...rest,
        ...(inductionDate !== undefined ? { inductionDate: inductionDate ? new Date(inductionDate) : null } : {}),
      },
    })

    void logActivity(orgId, user.id, user.email ?? null, 'CONTRACTOR_WORKER_UPDATED',
      { type: 'ContractorWorker', id: worker.id },
      { fullName: worker.fullName },
    )

    return success(updated)
  } catch (err) {
    logger.error('contractor-worker-patch', { error: err })
    return handlePrismaError(err)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; contractorId: string; workerId: string }> },
) {
  try {
    const { orgId, user } = await getProfileOrRedirect()
    const { contractorId, workerId } = await params

    const worker = await findWorker(workerId, contractorId, orgId)
    if (!worker) return error('NOT_FOUND', 'Worker not found', 404)

    await prisma.contractorWorker.delete({ where: { id: workerId } })

    void logActivity(orgId, user.id, user.email ?? null, 'CONTRACTOR_WORKER_REMOVED',
      { type: 'ContractorWorker', id: workerId },
      { fullName: worker.fullName, contractorId },
    )

    return success({ deleted: true })
  } catch (err) {
    logger.error('contractor-worker-delete', { error: err })
    return handlePrismaError(err)
  }
}
