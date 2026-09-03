import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const createSchema = z.object({
  title:           z.string().min(1),
  description:     z.string().optional(),
  priority:        z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  assignedToId:    z.string().optional(),
  dueDate:         z.string().optional(),
  hazardId:        z.string().optional(),
})

interface Params { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId } = await params

    const site = await prisma.site.findFirst({ where: { id: siteId, organizationId: orgId } })
    if (!site) return error('NOT_FOUND', 'Site not found', 404)

    const { searchParams } = new URL(request.url)
    const statusFilter   = searchParams.get('status')   ?? undefined
    const priorityFilter = searchParams.get('priority') ?? undefined

    const actions = await prisma.correctiveAction.findMany({
      where: {
        siteId,
        organizationId: orgId,
        ...(statusFilter   ? { status:   statusFilter   as never } : {}),
        ...(priorityFilter ? { priority: priorityFilter as never } : {}),
      },
      include: {
        assignedTo: { select: { id: true, fullName: true, jobTitle: true } },
        hazard:     { select: { id: true, hazardCode: true, taskId: true, task: { select: { name: true } } } },
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    })

    return success(actions)
  } catch (err) {
    logger.error('corrective-actions.list', { error: err })
    return handlePrismaError(err)
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const { id: siteId } = await params

    const site = await prisma.site.findFirst({ where: { id: siteId, organizationId: orgId } })
    if (!site) return error('NOT_FOUND', 'Site not found', 404)

    const body   = await request.json() as unknown
    const parsed = createSchema.parse(body)

    const action = await prisma.correctiveAction.create({
      data: {
        organizationId: orgId,
        siteId,
        title:        parsed.title,
        description:  parsed.description,
        priority:     parsed.priority,
        status:       'OPEN',
        assignedToId: parsed.assignedToId ?? null,
        dueDate:      parsed.dueDate ? new Date(parsed.dueDate) : null,
        hazardId:     parsed.hazardId ?? null,
        createdById:  profile.id,
      },
      include: {
        assignedTo: { select: { id: true, fullName: true, jobTitle: true } },
        hazard:     { select: { id: true, hazardCode: true, taskId: true, task: { select: { name: true } } } },
      },
    })

    void logActivity(orgId, profile.id, profile.email, 'CORRECTIVE_ACTION_CREATED',
      { type: 'CorrectiveAction', id: action.id },
      { siteId, title: action.title, priority: action.priority },
    )
    return success(action)
  } catch (err) {
    logger.error('corrective-actions.create', { error: err })
    return handlePrismaError(err)
  }
}
