import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const patchSchema = z.object({
  title:            z.string().min(1).optional(),
  description:      z.string().nullable().optional(),
  priority:         z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  status:           z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED']).optional(),
  assignedToId:     z.string().nullable().optional(),
  dueDate:          z.string().nullable().optional(),
  completedDate:    z.string().nullable().optional(),
  verificationNote: z.string().nullable().optional(),
  hazardId:         z.string().nullable().optional(),
})

type PatchInput = z.infer<typeof patchSchema>

function toDate(val: string | null | undefined): Date | null | undefined {
  if (val === undefined) return undefined
  return val ? new Date(val) : null
}

function buildUpdateData(parsed: PatchInput): Record<string, unknown> {
  const data: Record<string, unknown> = {}

  if (parsed.title            !== undefined) data['title']            = parsed.title
  if (parsed.description      !== undefined) data['description']      = parsed.description
  if (parsed.priority         !== undefined) data['priority']         = parsed.priority
  if (parsed.assignedToId     !== undefined) data['assignedToId']     = parsed.assignedToId
  if (parsed.verificationNote !== undefined) data['verificationNote'] = parsed.verificationNote
  if (parsed.hazardId         !== undefined) data['hazardId']         = parsed.hazardId

  const parsedDue       = toDate(parsed.dueDate)
  const parsedCompleted = toDate(parsed.completedDate)

  if (parsedDue       !== undefined) data['dueDate']       = parsedDue
  if (parsedCompleted !== undefined) data['completedDate'] = parsedCompleted

  if (parsed.status !== undefined) {
    data['status'] = parsed.status
    if (parsed.status === 'COMPLETED' && parsedCompleted === undefined) {
      data['completedDate'] = new Date()
    }
  }

  return data
}

interface Params { params: Promise<{ id: string; actionId: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const { id: siteId, actionId } = await params

    const existing = await prisma.correctiveAction.findFirst({
      where: { id: actionId, siteId, organizationId: orgId },
    })
    if (!existing) return error('NOT_FOUND', 'Corrective action not found', 404)

    const body   = await request.json() as unknown
    const parsed = patchSchema.parse(body)
    const data   = buildUpdateData(parsed)

    const updated = await prisma.correctiveAction.update({
      where: { id: actionId },
      data,
      include: {
        assignedTo: { select: { id: true, fullName: true, jobTitle: true } },
        hazard:     { select: { id: true, hazardCode: true, taskId: true, task: { select: { name: true } } } },
      },
    })

    void logActivity(orgId, profile.id, profile.email, 'CORRECTIVE_ACTION_UPDATED',
      { type: 'CorrectiveAction', id: actionId },
      { siteId, title: existing.title, newStatus: parsed.status },
    )
    return success(updated)
  } catch (err) {
    logger.error('corrective-actions.update', { error: err })
    return handlePrismaError(err)
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const { id: siteId, actionId } = await params

    const existing = await prisma.correctiveAction.findFirst({
      where: { id: actionId, siteId, organizationId: orgId },
    })
    if (!existing) return error('NOT_FOUND', 'Corrective action not found', 404)

    await prisma.correctiveAction.delete({ where: { id: actionId } })
    void logActivity(orgId, profile.id, profile.email, 'CORRECTIVE_ACTION_DELETED',
      { type: 'CorrectiveAction', id: actionId },
      { siteId, title: existing.title },
    )
    return success({ deleted: true })
  } catch (err) {
    logger.error('corrective-actions.delete', { error: err })
    return handlePrismaError(err)
  }
}
