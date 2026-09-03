import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'

interface Params { params: Promise<{ id: string }> }

const createSchema = z.object({
  name:                      z.string().min(1),
  category:                  z.string().min(1),
  serialNumber:              z.string().nullable().optional(),
  manufacturer:              z.string().nullable().optional(),
  model:                     z.string().nullable().optional(),
  certificationRef:          z.string().nullable().optional(),
  inspectionFrequencyMonths: z.coerce.number().int().positive().nullable().optional(),
  lastInspectionDate:        z.string().nullable().optional(),
  nextInspectionDate:        z.string().nullable().optional(),
  notes:                     z.string().nullable().optional(),
})

export async function GET(_request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId } = await params

    const site = await prisma.site.findFirst({ where: { id: siteId, organizationId: orgId } })
    if (!site) return error('NOT_FOUND', 'Site not found', 404)

    const equipment = await prisma.siteEquipment.findMany({
      where:   { siteId, organizationId: orgId },
      orderBy: { name: 'asc' },
      include: {
        taskLinks: {
          include: { task: { select: { id: true, name: true } } },
        },
      },
    })

    return success(equipment)
  } catch (err) {
    logger.error('sites.equipment.list', { error: err })
    return handlePrismaError(err)
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId } = await params

    const site = await prisma.site.findFirst({ where: { id: siteId, organizationId: orgId } })
    if (!site) return error('NOT_FOUND', 'Site not found', 404)

    const body   = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const equipment = await prisma.siteEquipment.create({
      data: {
        siteId,
        organizationId:            orgId,
        name:                      parsed.data.name,
        category:                  parsed.data.category,
        serialNumber:              parsed.data.serialNumber ?? null,
        manufacturer:              parsed.data.manufacturer ?? null,
        model:                     parsed.data.model ?? null,
        certificationRef:          parsed.data.certificationRef ?? null,
        inspectionFrequencyMonths: parsed.data.inspectionFrequencyMonths ?? null,
        lastInspectionDate:        parsed.data.lastInspectionDate ? new Date(parsed.data.lastInspectionDate) : null,
        nextInspectionDate:        parsed.data.nextInspectionDate ? new Date(parsed.data.nextInspectionDate) : null,
        notes:                     parsed.data.notes ?? null,
      },
    })

    return success(equipment)
  } catch (err) {
    logger.error('sites.equipment.create', { error: err })
    return handlePrismaError(err)
  }
}
