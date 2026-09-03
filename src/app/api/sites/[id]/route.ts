import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const updateSiteSchema = z.object({
  name:             z.string().min(1).optional(),
  legalEntityName:  z.string().optional(),
  vatNumber:        z.string().optional(),
  taxCode:          z.string().optional(),
  atecoCode:        z.string().optional(),
  atecoDescription: z.string().optional(),
  address:          z.string().optional(),
  city:             z.string().optional(),
  country:          z.string().optional(),
  workingHours:     z.string().optional(),
  shiftPattern:     z.string().optional(),
  isActive:         z.boolean().optional(),
})

interface Params { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id } = await params

    const site = await prisma.site.findFirst({
      where: { id, organizationId: orgId },
      include: {
        dvr: true,
        safetyRoles: { orderBy: { roleType: 'asc' } },
        workerGroups: {
          include: { members: { include: { employee: { select: { id: true, fullName: true, jobTitle: true } } } } },
          orderBy: { code: 'asc' },
        },
      },
    })
    if (!site) return error('NOT_FOUND', 'Site not found', 404)

    return success(site)
  } catch (err) {
    logger.error('sites.get', { error: err })
    return handlePrismaError(err)
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)
    const { id } = await params

    const existing = await prisma.site.findFirst({ where: { id, organizationId: orgId } })
    if (!existing) return error('NOT_FOUND', 'Site not found', 404)

    const body   = await request.json() as unknown
    const parsed = updateSiteSchema.parse(body)

    const site = await prisma.site.update({
      where: { id },
      data: {
        ...(parsed.name             !== undefined ? { name:             parsed.name }             : {}),
        ...(parsed.legalEntityName  !== undefined ? { legalEntityName:  parsed.legalEntityName }  : {}),
        ...(parsed.vatNumber        !== undefined ? { vatNumber:        parsed.vatNumber }        : {}),
        ...(parsed.taxCode          !== undefined ? { taxCode:          parsed.taxCode }          : {}),
        ...(parsed.atecoCode        !== undefined ? { atecoCode:        parsed.atecoCode }        : {}),
        ...(parsed.atecoDescription !== undefined ? { atecoDescription: parsed.atecoDescription } : {}),
        ...(parsed.address          !== undefined ? { address:          parsed.address }          : {}),
        ...(parsed.city             !== undefined ? { city:             parsed.city }             : {}),
        ...(parsed.country          !== undefined ? { country:          parsed.country }          : {}),
        ...(parsed.workingHours     !== undefined ? { workingHours:     parsed.workingHours }     : {}),
        ...(parsed.shiftPattern     !== undefined ? { shiftPattern:     parsed.shiftPattern }     : {}),
        ...(parsed.isActive         !== undefined ? { isActive:         parsed.isActive }         : {}),
      },
    })

    void logActivity(orgId, profile.id, profile.email, 'SITE_UPDATED',
      { type: 'Site', id },
      { siteName: site.name },
    )
    return success(site)
  } catch (err) {
    logger.error('sites.update', { error: err })
    return handlePrismaError(err)
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)
    const { id } = await params

    const existing = await prisma.site.findFirst({ where: { id, organizationId: orgId } })
    if (!existing) return error('NOT_FOUND', 'Site not found', 404)

    await prisma.site.delete({ where: { id } })
    void logActivity(orgId, profile.id, profile.email, 'SITE_DELETED',
      { type: 'Site', id },
      { siteName: existing.name },
    )
    return success({ deleted: true })
  } catch (err) {
    logger.error('sites.delete', { error: err })
    return handlePrismaError(err)
  }
}
