import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { z } from 'zod'

const updateSchema = z.object({
  status:                z.enum(['NOT_STARTED', 'IN_PROGRESS', 'DONE', 'NOT_APPLICABLE']).optional(),
  assignedToEmployeeId:  z.string().nullable().optional(),
  dueDate:               z.string().nullable().optional(),
  completedDate:         z.string().nullable().optional(),
  evidenceFileUrl:       z.string().nullable().optional(),
  notes:                 z.string().nullable().optional(),
  verifiedByProfessional: z.boolean().optional(),
  verifiedByName:        z.string().nullable().optional(),
})

type ParsedUpdate = z.infer<typeof updateSchema>
type ExistingItem = { completedDate: Date | null }

function buildItemUpdateData(parsed: ParsedUpdate, item: ExistingItem): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  if (parsed.status                !== undefined) data.status                = parsed.status
  if (parsed.verifiedByProfessional !== undefined) data.verifiedByProfessional = parsed.verifiedByProfessional

  if (parsed.assignedToEmployeeId !== undefined) data.assignedToEmployeeId = parsed.assignedToEmployeeId ?? null
  if (parsed.evidenceFileUrl      !== undefined) data.evidenceFileUrl      = parsed.evidenceFileUrl      ?? null
  if (parsed.notes                !== undefined) data.notes                = parsed.notes                ?? null
  if (parsed.verifiedByName       !== undefined) data.verifiedByName       = parsed.verifiedByName       ?? null
  if (parsed.dueDate       !== undefined) data.dueDate       = parsed.dueDate       ? new Date(parsed.dueDate)       : null
  if (parsed.completedDate !== undefined) data.completedDate = parsed.completedDate ? new Date(parsed.completedDate) : null

  if (parsed.status === 'DONE' && !item.completedDate && !parsed.completedDate) {
    data.completedDate = new Date()
  }
  return data
}

interface Params { params: Promise<{ id: string; itemId: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { orgId }                 = await getProfileOrRedirect()
    const { id: projectId, itemId } = await params

    const project = await prisma.project.findFirst({ where: { id: projectId, organizationId: orgId } })
    if (!project) return error('NOT_FOUND', 'Project not found', 404)

    const item = await prisma.projectSafetyItem.findFirst({
      where: { id: itemId, projectId, organizationId: orgId },
    })
    if (!item) return error('NOT_FOUND', 'Safety item not found', 404)

    const body   = await request.json() as unknown
    const parsed = updateSchema.parse(body)

    const updated = await prisma.projectSafetyItem.update({
      where: { id: itemId },
      data:  buildItemUpdateData(parsed, item),
    })
    return success(updated)
  } catch (err) {
    logger.error('safety-checklist.update-item', { error: err })
    return handlePrismaError(err)
  }
}
