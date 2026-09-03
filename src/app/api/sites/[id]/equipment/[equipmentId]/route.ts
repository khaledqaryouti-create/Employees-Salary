import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'

interface Params { params: Promise<{ id: string; equipmentId: string }> }

const patchSchema = z.object({
  name:                      z.string().min(1).optional(),
  category:                  z.string().min(1).optional(),
  serialNumber:              z.string().nullable().optional(),
  manufacturer:              z.string().nullable().optional(),
  model:                     z.string().nullable().optional(),
  certificationRef:          z.string().nullable().optional(),
  inspectionFrequencyMonths: z.coerce.number().int().positive().nullable().optional(),
  lastInspectionDate:        z.string().nullable().optional(),
  nextInspectionDate:        z.string().nullable().optional(),
  notes:                     z.string().nullable().optional(),
  isActive:                  z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId, equipmentId } = await params

    const equip = await prisma.siteEquipment.findFirst({
      where: { id: equipmentId, siteId, organizationId: orgId },
    })
    if (!equip) return error('NOT_FOUND', 'Equipment not found', 404)

    const body   = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const { lastInspectionDate, nextInspectionDate, ...rest } = parsed.data

    const updated = await prisma.siteEquipment.update({
      where: { id: equipmentId },
      data:  {
        ...rest,
        ...(lastInspectionDate !== undefined
          ? { lastInspectionDate: lastInspectionDate ? new Date(lastInspectionDate) : null }
          : {}),
        ...(nextInspectionDate !== undefined
          ? { nextInspectionDate: nextInspectionDate ? new Date(nextInspectionDate) : null }
          : {}),
      },
    })

    return success(updated)
  } catch (err) {
    logger.error('sites.equipment.update', { error: err })
    return handlePrismaError(err)
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId, equipmentId } = await params

    const equip = await prisma.siteEquipment.findFirst({
      where: { id: equipmentId, siteId, organizationId: orgId },
    })
    if (!equip) return error('NOT_FOUND', 'Equipment not found', 404)

    await prisma.siteEquipment.delete({ where: { id: equipmentId } })

    return success({ deleted: true })
  } catch (err) {
    logger.error('sites.equipment.delete', { error: err })
    return handlePrismaError(err)
  }
}
