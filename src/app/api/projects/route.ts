import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { validateFormula } from '@/lib/formula-engine/evaluator'
import { inngest } from '@/lib/inngest/client'
import { z } from 'zod'

const createProjectSchema = z.object({
  code:                  z.string().min(1),
  name:                  z.string().min(1),
  description:           z.string().optional(),
  clientName:            z.string().optional(),
  status:                z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).default('PLANNING'),
  startDate:             z.string().min(1),
  endDate:               z.string().optional(),
  budgetAmount:          z.coerce.number().nonnegative().optional(),
  currency:              z.string().default('USD'),
  costCenter:            z.string().optional(),
  orgUnitId:             z.string().optional(),
  managerId:             z.string().optional(),
  billable:              z.boolean().default(true),
  allocationMode:        z.enum(['PERCENTAGE', 'HOURS']).default('PERCENTAGE'),
  overheadFormula:       z.string().optional(),
  projectType:           z.enum(['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE', 'ELECTRICAL_INFRASTRUCTURE', 'DATA_CENTER', 'OTHER']).optional(),
  countryId:             z.string().optional(),
  buildingHeightMeters:  z.coerce.number().nonnegative().optional(),
  hasElectricalWorks:    z.boolean().default(false),
  hasMultipleContractors: z.boolean().default(false),
  occupancyType:         z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const { orgId } = await getProfileOrRedirect()

    const { searchParams } = new URL(request.url)
    const page    = Number.parseInt(searchParams.get('page') ?? '1')
    const limit   = Math.min(Number.parseInt(searchParams.get('limit') ?? '50'), 100)
    const search  = searchParams.get('search') ?? ''
    const status  = searchParams.get('status') ?? ''

    const where = {
      organizationId: orgId,
      ...(search && {
        OR: [
          { name:  { contains: search, mode: 'insensitive' as const } },
          { code:  { contains: search, mode: 'insensitive' as const } },
          { clientName: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(status && { status: status as 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED' }),
    }

    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          manager:  { select: { id: true, fullName: true } },
          orgUnit:  { select: { id: true, name: true } },
          _count:   { select: { resourceAssignments: true, safetyRequirements: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.project.count({ where }),
    ])

    return success({ data, total, page, limit })
  } catch (err) {
    logger.error('projects.list', { error: err })
    return handlePrismaError(err)
  }
}

type CreateInput = z.infer<typeof createProjectSchema>

function buildCreateData(parsed: CreateInput, orgId: string) {
  return {
    code:                  parsed.code,
    name:                  parsed.name,
    organizationId:        orgId,
    status:                parsed.status,
    startDate:             new Date(parsed.startDate),
    endDate:               parsed.endDate ? new Date(parsed.endDate) : null,
    budgetAmount:          parsed.budgetAmount ?? null,
    currency:              parsed.currency,
    billable:              parsed.billable,
    allocationMode:        parsed.allocationMode,
    hasElectricalWorks:    parsed.hasElectricalWorks,
    hasMultipleContractors: parsed.hasMultipleContractors,
    ...(parsed.description           ? { description:           parsed.description }           : {}),
    ...(parsed.clientName            ? { clientName:            parsed.clientName }            : {}),
    ...(parsed.costCenter            ? { costCenter:            parsed.costCenter }            : {}),
    ...(parsed.orgUnitId             ? { orgUnitId:             parsed.orgUnitId }             : {}),
    ...(parsed.managerId             ? { managerId:             parsed.managerId }             : {}),
    ...(parsed.overheadFormula       ? { overheadFormula:       parsed.overheadFormula }       : {}),
    ...(parsed.projectType           ? { projectType:           parsed.projectType }           : {}),
    ...(parsed.countryId             ? { countryId:             parsed.countryId }             : {}),
    ...(parsed.occupancyType         ? { occupancyType:         parsed.occupancyType }         : {}),
    ...(parsed.buildingHeightMeters !== undefined ? { buildingHeightMeters: parsed.buildingHeightMeters } : {}),
  }
}

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

export async function POST(request: Request) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const body   = await request.json() as unknown
    const parsed = createProjectSchema.parse(body)

    if (parsed.overheadFormula) {
      const formulaErr = validateFormula(parsed.overheadFormula)
      if (formulaErr) return error('INVALID_FORMULA', formulaErr.message, 400)
    }

    const project = await prisma.project.create({ data: buildCreateData(parsed, orgId) })

    // Trigger checklist generation — non-blocking so a missing Inngest server doesn't fail the create
    if (project.projectType && project.countryId) {
      inngest.send({
        name: 'project/safety-checklist.generate',
        data: { projectId: project.id, organizationId: orgId },
      }).catch((e: unknown) => logger.error('projects.create.inngest', { error: e }))
    }

    return success(project)
  } catch (err) {
    logger.error('projects.create', { error: err })
    return handlePrismaError(err)
  }
}
