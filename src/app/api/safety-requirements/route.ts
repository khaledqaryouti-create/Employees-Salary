import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const createSchema = z.object({
  countryId:        z.string().min(1),
  projectTypes:     z.array(z.enum(['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE', 'ELECTRICAL_INFRASTRUCTURE', 'DATA_CENTER', 'OTHER'])),
  category:         z.enum(['GENERAL_OHS', 'CONSTRUCTION_SITE', 'FIRE_SAFETY', 'ELECTRICAL_SAFETY', 'SPECIALIZED_RISK', 'ENVIRONMENTAL']),
  title:            z.string().min(1),
  description:      z.string().min(1),
  legalReference:   z.string().min(1),
  triggerCondition: z.string().optional(),
  requiredRole:     z.string().optional(),
  requiredDocument: z.string().optional(),
  mandatory:        z.boolean().default(true),
  recurring:        z.boolean().default(false),
  recurrenceMonths: z.coerce.number().int().positive().optional(),
  sortOrder:        z.coerce.number().int().default(0),
})

export async function GET(request: Request) {
  try {
    await getProfileOrRedirect()
    const { searchParams } = new URL(request.url)
    const countryId    = searchParams.get('countryId') ?? undefined
    const projectType  = searchParams.get('projectType') ?? undefined
    const category     = searchParams.get('category') ?? undefined
    const activeOnly   = searchParams.get('active') !== 'false'

    const requirements = await prisma.safetyRequirement.findMany({
      where: {
        ...(countryId   ? { countryId }                                        : {}),
        ...(projectType ? { projectTypes: { has: projectType as never } }      : {}),
        ...(category    ? { category: category as never }                      : {}),
        ...(activeOnly  ? { active: true }                                     : {}),
      },
      include: { country: { select: { id: true, code: true, name: true } } },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      take: 500,
    })
    return success(requirements)
  } catch (err) {
    logger.error('safety-requirements.list', { error: err })
    return handlePrismaError(err)
  }
}

export async function POST(request: Request) {
  try {
    const { profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const body   = await request.json() as unknown
    const parsed = createSchema.parse(body)

    const req = await prisma.safetyRequirement.create({
      data: {
        countryId:        parsed.countryId,
        projectTypes:     parsed.projectTypes,
        category:         parsed.category,
        title:            parsed.title,
        description:      parsed.description,
        legalReference:   parsed.legalReference,
        triggerCondition: parsed.triggerCondition ?? null,
        requiredRole:     parsed.requiredRole ?? null,
        requiredDocument: parsed.requiredDocument ?? null,
        mandatory:        parsed.mandatory,
        recurring:        parsed.recurring,
        recurrenceMonths: parsed.recurrenceMonths ?? null,
        sortOrder:        parsed.sortOrder,
      },
    })
    return success(req)
  } catch (err) {
    logger.error('safety-requirements.create', { error: err })
    return handlePrismaError(err)
  }
}
