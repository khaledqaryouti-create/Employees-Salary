import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'

interface Params { params: Promise<{ id: string }> }

const createSchema = z.object({
  name:        z.string().min(1),
  description: z.string().optional(),
})

export async function GET(_request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId } = await params

    const site = await prisma.site.findFirst({ where: { id: siteId, organizationId: orgId } })
    if (!site) return error('NOT_FOUND', 'Site not found', 404)

    const processes = await prisma.siteProcess.findMany({
      where:   { siteId, organizationId: orgId },
      orderBy: { name: 'asc' },
      include: {
        activities: {
          orderBy: { name: 'asc' },
          include: {
            tasks: {
              orderBy: { name: 'asc' },
              include: {
                workerGroups:     { include: { group: { select: { id: true, name: true } } } },
                equipmentLinks:   { include: { equipment: { select: { id: true, name: true } } } },
                hazardScreenings: { select: { hazardCode: true, isApplicable: true, justification: true, assessorName: true } },
              },
            },
          },
        },
      },
    })

    return success(processes)
  } catch (err) {
    logger.error('sites.processes.list', { error: err })
    return handlePrismaError(err)
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId } = await params

    const site = await prisma.site.findFirst({ where: { id: siteId, organizationId: orgId } })
    if (!site) return error('NOT_FOUND', 'Site not found', 404)

    const body   = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const proc = await prisma.siteProcess.create({
      data: {
        siteId,
        organizationId: orgId,
        name:           parsed.data.name,
        description:    parsed.data.description ?? null,
      },
    })

    return success(proc)
  } catch (err) {
    logger.error('sites.processes.create', { error: err })
    return handlePrismaError(err)
  }
}
