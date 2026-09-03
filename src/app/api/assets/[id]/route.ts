import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const updateAssetSchema = z.object({
  name:               z.string().min(1).optional(),
  serialNumber:       z.string().nullable().optional(),
  assetTag:           z.string().nullable().optional(),
  acquisitionCost:    z.coerce.number().nonnegative().optional(),
  residualValue:      z.coerce.number().nonnegative().optional(),
  acquisitionDate:    z.string().optional(),
  usefulLifeMonths:   z.coerce.number().int().positive().optional(),
  depreciationMethod: z.enum(['STRAIGHT_LINE']).optional(),
  status:             z.enum(['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED']).optional(),
})

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id }   = await params

    const asset = await prisma.asset.findFirst({
      where: { id, organizationId: orgId },
      include: {
        assetType: { select: { id: true, name: true } },
        assignments: {
          include: {
            project:  { select: { id: true, name: true } },
            employee: { select: { id: true, fullName: true } },
          },
          orderBy: { startDate: 'desc' },
        },
      },
    })
    if (!asset) return error('NOT_FOUND', 'Asset not found', 404)

    // Compute monthly depreciation (straight-line)
    const monthlyDepreciation =
      (Number(asset.acquisitionCost) - Number(asset.residualValue)) / asset.usefulLifeMonths

    return success({ ...asset, monthlyDepreciation: Math.round(monthlyDepreciation * 100) / 100 })
  } catch (err) {
    logger.error('assets.get', { error: err })
    return handlePrismaError(err)
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const { id } = await params
    const existing = await prisma.asset.findFirst({ where: { id, organizationId: orgId } })
    if (!existing) return error('NOT_FOUND', 'Asset not found', 404)

    const body   = await request.json() as unknown
    const parsed = updateAssetSchema.parse(body)

    const asset = await prisma.asset.update({
      where: { id },
      data: {
        ...parsed,
        ...(parsed.acquisitionDate && { acquisitionDate: new Date(parsed.acquisitionDate) }),
      },
    })
    return success(asset)
  } catch (err) {
    logger.error('assets.update', { error: err })
    return handlePrismaError(err)
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const { id } = await params
    const existing = await prisma.asset.findFirst({ where: { id, organizationId: orgId } })
    if (!existing) return error('NOT_FOUND', 'Asset not found', 404)

    await prisma.asset.delete({ where: { id } })
    return success({ id })
  } catch (err) {
    logger.error('assets.delete', { error: err })
    return handlePrismaError(err)
  }
}
