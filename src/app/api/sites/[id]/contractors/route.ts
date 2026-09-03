import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { logActivity } from '@/lib/system-log'

const createSchema = z.object({
  companyName: z.string().min(1).max(200),
  vatNumber: z.string().max(50).optional(),
  contactName: z.string().max(100).optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().max(50).optional(),
  workScope: z.string().max(500).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId } = await params

    const site = await prisma.site.findFirst({
      where: { id: siteId, organizationId: orgId },
      select: { id: true },
    })
    if (!site) return error('NOT_FOUND', 'Site not found', 404)

    const contractors = await prisma.contractor.findMany({
      where: { siteId, organizationId: orgId },
      orderBy: { companyName: 'asc' },
      include: {
        _count: { select: { workers: true, permits: true } },
      },
    })

    return success(contractors)
  } catch (err) {
    logger.error('contractors-get', { error: err })
    return handlePrismaError(err)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId, user } = await getProfileOrRedirect()
    const { id: siteId } = await params

    const site = await prisma.site.findFirst({
      where: { id: siteId, organizationId: orgId },
      select: { id: true },
    })
    if (!site) return error('NOT_FOUND', 'Site not found', 404)

    const body: unknown = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const { startDate, endDate, contactEmail, ...rest } = parsed.data

    const contractor = await prisma.contractor.create({
      data: {
        ...rest,
        contactEmail: contactEmail ?? null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        siteId,
        organizationId: orgId,
      },
    })

    void logActivity(orgId, user.id, user.email ?? null, 'CONTRACTOR_CREATED',
      { type: 'Contractor', id: contractor.id },
      { companyName: contractor.companyName, siteId },
    )

    return success(contractor)
  } catch (err) {
    logger.error('contractors-post', { error: err })
    return handlePrismaError(err)
  }
}
