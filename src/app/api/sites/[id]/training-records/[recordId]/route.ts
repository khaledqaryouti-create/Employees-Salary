import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const patchSchema = z.object({
  trainingType:   z.string().min(1).optional(),
  description:    z.string().nullable().optional(),
  trainerName:    z.string().nullable().optional(),
  trainingDate:   z.string().optional(),
  expiryDate:     z.string().nullable().optional(),
  certificateRef: z.string().nullable().optional(),
  workerGroupId:  z.string().nullable().optional(),
  employeeId:     z.string().nullable().optional(),
})

function computeStatus(expiryDate: Date | null): 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' {
  if (!expiryDate) return 'VALID'
  const now  = new Date()
  const soon = new Date()
  soon.setDate(soon.getDate() + 60)
  if (expiryDate < now)  return 'EXPIRED'
  if (expiryDate < soon) return 'EXPIRING_SOON'
  return 'VALID'
}

interface Params { params: Promise<{ id: string; recordId: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const { id: siteId, recordId } = await params

    const existing = await prisma.siteTrainingRecord.findFirst({
      where: { id: recordId, siteId, organizationId: orgId },
    })
    if (!existing) return error('NOT_FOUND', 'Training record not found', 404)

    const body   = await request.json() as unknown
    const parsed = patchSchema.parse(body)

    const data: Record<string, unknown> = {}
    if (parsed.trainingType   !== undefined) data['trainingType']   = parsed.trainingType
    if (parsed.description    !== undefined) data['description']    = parsed.description
    if (parsed.trainerName    !== undefined) data['trainerName']    = parsed.trainerName
    if (parsed.certificateRef !== undefined) data['certificateRef'] = parsed.certificateRef
    if (parsed.workerGroupId  !== undefined) data['workerGroupId']  = parsed.workerGroupId
    if (parsed.employeeId     !== undefined) data['employeeId']     = parsed.employeeId

    if (parsed.trainingDate !== undefined) {
      data['trainingDate'] = new Date(parsed.trainingDate)
    }

    const newExpiryDate = parsed.expiryDate !== undefined
      ? (parsed.expiryDate ? new Date(parsed.expiryDate) : null)
      : existing.expiryDate

    if (parsed.expiryDate !== undefined) data['expiryDate'] = newExpiryDate
    data['status'] = computeStatus(newExpiryDate)

    const updated = await prisma.siteTrainingRecord.update({
      where: { id: recordId },
      data,
      include: {
        workerGroup: { select: { id: true, name: true, code: true } },
        employee:    { select: { id: true, fullName: true } },
      },
    })

    void logActivity(orgId, profile.id, profile.email, 'TRAINING_RECORD_UPDATED',
      { type: 'TrainingRecord', id: recordId },
      { siteId, trainingType: existing.trainingType },
    )
    return success(updated)
  } catch (err) {
    logger.error('training-records.update', { error: err })
    return handlePrismaError(err)
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const { id: siteId, recordId } = await params

    const existing = await prisma.siteTrainingRecord.findFirst({
      where: { id: recordId, siteId, organizationId: orgId },
    })
    if (!existing) return error('NOT_FOUND', 'Training record not found', 404)

    await prisma.siteTrainingRecord.delete({ where: { id: recordId } })
    void logActivity(orgId, profile.id, profile.email, 'TRAINING_RECORD_DELETED',
      { type: 'TrainingRecord', id: recordId },
      { siteId, trainingType: existing.trainingType },
    )
    return success({ deleted: true })
  } catch (err) {
    logger.error('training-records.delete', { error: err })
    return handlePrismaError(err)
  }
}
