import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const createSchema = z.object({
  trainingType:   z.string().min(1),
  description:    z.string().nullable().optional(),
  trainerName:    z.string().nullable().optional(),
  trainingDate:   z.string().min(1),
  expiryDate:     z.string().nullable().optional(),
  certificateRef: z.string().nullable().optional(),
  workerGroupId:  z.string().nullable().optional(),
  employeeId:     z.string().nullable().optional(),
})

function computeStatus(expiryDate: Date | null): 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' {
  if (!expiryDate) return 'VALID'
  const now      = new Date()
  const soon     = new Date()
  soon.setDate(soon.getDate() + 60)
  if (expiryDate < now)   return 'EXPIRED'
  if (expiryDate < soon)  return 'EXPIRING_SOON'
  return 'VALID'
}

interface Params { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId } = await params

    const site = await prisma.site.findFirst({ where: { id: siteId, organizationId: orgId } })
    if (!site) return error('NOT_FOUND', 'Site not found', 404)

    const { searchParams } = new URL(request.url)
    const workerGroupId = searchParams.get('workerGroupId') ?? undefined

    const records = await prisma.siteTrainingRecord.findMany({
      where: {
        siteId,
        organizationId: orgId,
        ...(workerGroupId ? { workerGroupId } : {}),
      },
      include: {
        workerGroup: { select: { id: true, name: true, code: true } },
        employee:    { select: { id: true, fullName: true } },
      },
      orderBy: [{ expiryDate: 'asc' }, { trainingDate: 'desc' }],
    })

    // Auto-compute status and sync to DB if changed
    const updated = await Promise.all(
      records.map(async (r) => {
        const computed = computeStatus(r.expiryDate)
        if (computed !== r.status) {
          return prisma.siteTrainingRecord.update({
            where: { id: r.id },
            data:  { status: computed },
            include: {
              workerGroup: { select: { id: true, name: true, code: true } },
              employee:    { select: { id: true, fullName: true } },
            },
          })
        }
        return r
      })
    )

    return success(updated)
  } catch (err) {
    logger.error('training-records.list', { error: err })
    return handlePrismaError(err)
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const { id: siteId } = await params

    const site = await prisma.site.findFirst({ where: { id: siteId, organizationId: orgId } })
    if (!site) return error('NOT_FOUND', 'Site not found', 404)

    const body   = await request.json() as unknown
    const parsed = createSchema.parse(body)

    const expiryDate   = parsed.expiryDate ? new Date(parsed.expiryDate) : null
    const trainingDate = new Date(parsed.trainingDate)
    const status       = computeStatus(expiryDate)

    const record = await prisma.siteTrainingRecord.create({
      data: {
        organizationId: orgId,
        siteId,
        trainingType:   parsed.trainingType,
        description:    parsed.description ?? null,
        trainerName:    parsed.trainerName ?? null,
        trainingDate,
        expiryDate,
        certificateRef: parsed.certificateRef ?? null,
        workerGroupId:  parsed.workerGroupId ?? null,
        employeeId:     parsed.employeeId ?? null,
        status,
        createdById:    profile.id,
      },
      include: {
        workerGroup: { select: { id: true, name: true, code: true } },
        employee:    { select: { id: true, fullName: true } },
      },
    })

    void logActivity(orgId, profile.id, profile.email, 'TRAINING_RECORD_CREATED',
      { type: 'TrainingRecord', id: record.id },
      { siteId, trainingType: record.trainingType, status: record.status },
    )
    return success(record)
  } catch (err) {
    logger.error('training-records.create', { error: err })
    return handlePrismaError(err)
  }
}
