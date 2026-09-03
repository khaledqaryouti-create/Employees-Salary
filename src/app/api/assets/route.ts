import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const createAssetSchema = z.object({
  assetTypeId:        z.string().min(1),
  name:               z.string().min(1),
  serialNumber:       z.string().optional(),
  assetTag:           z.string().optional(),
  acquisitionCost:    z.coerce.number().nonnegative(),
  residualValue:      z.coerce.number().nonnegative().default(0),
  acquisitionDate:    z.string().min(1),
  usefulLifeMonths:   z.coerce.number().int().positive(),
  depreciationMethod: z.enum(['STRAIGHT_LINE']).default('STRAIGHT_LINE'),
  status:             z.enum(['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED']).default('AVAILABLE'),
})

export async function GET(request: Request) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { searchParams } = new URL(request.url)
    const page   = Number.parseInt(searchParams.get('page') ?? '1')
    const limit  = Math.min(Number.parseInt(searchParams.get('limit') ?? '50'), 100)
    const search = searchParams.get('search') ?? ''
    const status = searchParams.get('status') ?? ''

    const where = {
      organizationId: orgId,
      ...(search && {
        OR: [
          { name:         { contains: search, mode: 'insensitive' as const } },
          { serialNumber: { contains: search, mode: 'insensitive' as const } },
          { assetTag:     { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(status && { status: status as 'AVAILABLE' | 'ASSIGNED' | 'MAINTENANCE' | 'RETIRED' }),
    }

    const [data, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: { assetType: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.asset.count({ where }),
    ])

    return success({ data, total, page, limit })
  } catch (err) {
    logger.error('assets.list', { error: err })
    return handlePrismaError(err)
  }
}

export async function POST(request: Request) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const body   = await request.json() as unknown
    const parsed = createAssetSchema.parse(body)

    const asset = await prisma.asset.create({
      data: {
        ...parsed,
        organizationId:  orgId,
        acquisitionDate: new Date(parsed.acquisitionDate),
      },
    })

    return success(asset)
  } catch (err) {
    logger.error('assets.create', { error: err })
    return handlePrismaError(err)
  }
}
