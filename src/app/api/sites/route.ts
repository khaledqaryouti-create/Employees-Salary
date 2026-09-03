import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const createSiteSchema = z.object({
  name:             z.string().min(1),
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
})

export async function GET(request: Request) {
  try {
    const { orgId, activeBranchId } = await getProfileOrRedirect()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() ?? ''

    const where = {
      organizationId: orgId,
      ...(activeBranchId ? { branchId: activeBranchId } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    }

    const sites = await prisma.site.findMany({
      where,
      include: {
        dvr: { select: { status: true, version: true } },
        _count: { select: { safetyRoles: true, workerGroups: true } },
      },
      orderBy: { name: 'asc' },
      take: 200,
    })
    return success(sites)
  } catch (err) {
    logger.error('sites.list', { error: err })
    return handlePrismaError(err)
  }
}

export async function POST(request: Request) {
  try {
    const { orgId, activeBranchId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const body   = await request.json() as unknown
    const parsed = createSiteSchema.parse(body)

    const site = await prisma.site.create({
      data: {
        organizationId:   orgId,
        branchId:         activeBranchId,
        name:             parsed.name,
        legalEntityName:  parsed.legalEntityName,
        vatNumber:        parsed.vatNumber,
        taxCode:          parsed.taxCode,
        atecoCode:        parsed.atecoCode,
        atecoDescription: parsed.atecoDescription,
        address:          parsed.address,
        city:             parsed.city,
        country:          parsed.country,
        workingHours:     parsed.workingHours,
        shiftPattern:     parsed.shiftPattern,
      },
    })

    // Auto-create the DVR shell in SETUP status — every site must have exactly one DVR.
    await prisma.dvrSetup.create({
      data: {
        organizationId: orgId,
        branchId:       activeBranchId,
        siteId:         site.id,
        status:         'SETUP',
      },
    })

    void logActivity(orgId, profile.id, profile.email, 'SITE_CREATED',
      { type: 'Site', id: site.id },
      { siteName: site.name },
    )
    return success(site)
  } catch (err) {
    logger.error('sites.create', { error: err })
    return handlePrismaError(err)
  }
}
