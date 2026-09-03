import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const ROLE_TYPES = [
  'EMPLOYER', 'RSPP', 'ASPP', 'RLS', 'RLST', 'MEDICO_COMPETENTE',
  'MANAGER', 'SUPERVISOR', 'FIRST_AID', 'FIRE_EMERGENCY',
] as const

const createRoleSchema = z.object({
  roleType:        z.enum(ROLE_TYPES),
  employeeId:      z.string().optional(),
  externalName:    z.string().optional(),
  appointmentDate: z.string().min(1),
  expiryDate:      z.string().optional(),
  documentUrl:     z.string().optional(),
  notes:           z.string().optional(),
}).refine((v) => Boolean(v.employeeId) || Boolean(v.externalName), {
  message: 'Either an employee or an external name must be provided',
  path:    ['employeeId'],
})

interface Params { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId } = await params

    const site = await prisma.site.findFirst({ where: { id: siteId, organizationId: orgId } })
    if (!site) return error('NOT_FOUND', 'Site not found', 404)

    const roles = await prisma.safetyRoleAppointment.findMany({
      where: { siteId, organizationId: orgId },
      include: { employee: { select: { id: true, fullName: true, jobTitle: true } } },
      orderBy: [{ isActive: 'desc' }, { roleType: 'asc' }],
    })
    return success(roles)
  } catch (err) {
    logger.error('safety-roles.list', { error: err })
    return handlePrismaError(err)
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId, activeBranchId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)
    const { id: siteId } = await params

    const site = await prisma.site.findFirst({ where: { id: siteId, organizationId: orgId } })
    if (!site) return error('NOT_FOUND', 'Site not found', 404)

    const body   = await request.json() as unknown
    const parsed = createRoleSchema.parse(body)

    if (parsed.employeeId) {
      const emp = await prisma.employee.findFirst({ where: { id: parsed.employeeId, organizationId: orgId } })
      if (!emp) return error('VALIDATION', 'Selected employee was not found', 400, 'employeeId')
    }

    const role = await prisma.safetyRoleAppointment.create({
      data: {
        organizationId:  orgId,
        branchId:        activeBranchId,
        siteId,
        roleType:        parsed.roleType,
        employeeId:      parsed.employeeId ?? null,
        externalName:    parsed.externalName ?? null,
        appointmentDate: new Date(parsed.appointmentDate),
        expiryDate:      parsed.expiryDate ? new Date(parsed.expiryDate) : null,
        documentUrl:     parsed.documentUrl ?? null,
        notes:           parsed.notes ?? null,
      },
      include: { employee: { select: { id: true, fullName: true, jobTitle: true } } },
    })

    void logActivity(orgId, profile.id, profile.email, 'SAFETY_ROLE_APPOINTED',
      { type: 'SafetyRole', id: role.id },
      { siteId, roleType: role.roleType, name: role.externalName ?? role.employee?.fullName },
    )
    return success(role)
  } catch (err) {
    logger.error('safety-roles.create', { error: err })
    return handlePrismaError(err)
  }
}
