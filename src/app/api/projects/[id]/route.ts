import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { validateFormula } from '@/lib/formula-engine/evaluator'
import { inngest } from '@/lib/inngest/client'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const updateProjectSchema = z.object({
  code:                  z.string().min(1).optional(),
  name:                  z.string().min(1).optional(),
  description:           z.string().optional(),
  clientName:            z.string().optional(),
  status:                z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
  startDate:             z.string().optional(),
  endDate:               z.string().nullable().optional(),
  budgetAmount:          z.coerce.number().nonnegative().nullable().optional(),
  currency:              z.string().optional(),
  costCenter:            z.string().optional(),
  orgUnitId:             z.string().nullable().optional(),
  managerId:             z.string().nullable().optional(),
  billable:              z.boolean().optional(),
  allocationMode:        z.enum(['PERCENTAGE', 'HOURS']).optional(),
  overheadFormula:       z.string().nullable().optional(),
  projectType:           z.enum(['FACTORY_CONSTRUCTION', 'TOWER_HIGH_RISE', 'ELECTRICAL_INFRASTRUCTURE', 'DATA_CENTER', 'OTHER']).nullable().optional(),
  countryId:             z.string().nullable().optional(),
  buildingHeightMeters:  z.coerce.number().nonnegative().nullable().optional(),
  hasElectricalWorks:    z.boolean().optional(),
  hasMultipleContractors: z.boolean().optional(),
  occupancyType:         z.string().nullable().optional(),
})

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id }   = await params

    const project = await prisma.project.findFirst({
      where: { id, organizationId: orgId },
      include: {
        manager:  { select: { id: true, fullName: true } },
        orgUnit:  { select: { id: true, name: true } },
        resourceAssignments: {
          include: { employee: { select: { id: true, fullName: true, employeeNumber: true } } },
          orderBy: { createdAt: 'desc' },
        },
        safetyRequirements: {
          include: { completedBy: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'asc' },
        },
        budgetLines: { orderBy: { periodStart: 'asc' } },
        _count: { select: { costDistributions: true, assetAssignments: true } },
      },
    })

    if (!project) return error('NOT_FOUND', 'Project not found', 404)
    return success(project)
  } catch (err) {
    logger.error('projects.get', { error: err })
    return handlePrismaError(err)
  }
}

type UpdateInput = z.infer<typeof updateProjectSchema>

const CHECKLIST_TRIGGER_FIELDS = new Set(['projectType', 'countryId', 'hasElectricalWorks', 'hasMultipleContractors'])

function buildUpdateData(parsed: UpdateInput): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  const simple = ['code', 'name', 'status', 'currency', 'billable', 'allocationMode', 'budgetAmount', 'hasElectricalWorks', 'hasMultipleContractors'] as const
  for (const key of simple) {
    if (parsed[key] !== undefined) data[key] = parsed[key]
  }
  const nullable = ['description', 'clientName', 'costCenter', 'orgUnitId', 'managerId', 'overheadFormula', 'projectType', 'countryId', 'occupancyType', 'buildingHeightMeters'] as const
  for (const key of nullable) {
    if (parsed[key] !== undefined) data[key] = parsed[key] ?? null
  }
  if (parsed.startDate) data.startDate = new Date(parsed.startDate)
  if (parsed.endDate !== undefined) data.endDate = parsed.endDate ? new Date(parsed.endDate) : null
  return data
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const { id } = await params
    const existing = await prisma.project.findFirst({ where: { id, organizationId: orgId } })
    if (!existing) return error('NOT_FOUND', 'Project not found', 404)

    const body   = await request.json() as unknown
    const parsed = updateProjectSchema.parse(body)

    if (parsed.overheadFormula) {
      const formulaErr = validateFormula(parsed.overheadFormula)
      if (formulaErr) return error('INVALID_FORMULA', formulaErr.message, 400)
    }

    const project = await prisma.project.update({ where: { id }, data: buildUpdateData(parsed) })

    // Re-generate checklist if any checklist-trigger field changed — non-blocking
    const triggerChanged = Object.keys(parsed).some((k) => CHECKLIST_TRIGGER_FIELDS.has(k))
    if (triggerChanged && project.projectType && project.countryId) {
      inngest.send({
        name: 'project/safety-checklist.generate',
        data: { projectId: id, organizationId: orgId },
      }).catch((e: unknown) => logger.error('projects.update.inngest', { error: e }))
    }

    return success(project)
  } catch (err) {
    logger.error('projects.update', { error: err })
    return handlePrismaError(err)
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const { id } = await params
    const existing = await prisma.project.findFirst({ where: { id, organizationId: orgId } })
    if (!existing) return error('NOT_FOUND', 'Project not found', 404)

    await prisma.project.delete({ where: { id } })
    return success({ id })
  } catch (err) {
    logger.error('projects.delete', { error: err })
    return handlePrismaError(err)
  }
}
