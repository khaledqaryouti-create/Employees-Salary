import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { prisma } from '@/lib/prisma/client'
import { success, error } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { logActivity } from '@/lib/system-log'

const patchSchema = z.object({
  incidentType: z.enum(['ACCIDENT', 'NEAR_MISS', 'DANGEROUS_OCCURRENCE', 'OCCUPATIONAL_DISEASE']).optional(),
  severity: z.enum(['FATAL', 'MAJOR', 'MINOR', 'FIRST_AID_ONLY', 'NO_INJURY']).optional(),
  status: z.enum(['REPORTED', 'UNDER_INVESTIGATION', 'CORRECTIVE_ACTIONS_ASSIGNED', 'CLOSED']).optional(),
  incidentDate: z.string().optional(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  injuredPerson: z.string().nullable().optional(),
  witnesses: z.string().nullable().optional(),
  immediateAction: z.string().nullable().optional(),
  rootCause: z.string().nullable().optional(),
  hazardId: z.string().nullable().optional(),
})

interface Params { params: Promise<{ id: string; incidentId: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    const { id: siteId, incidentId } = await params

    const existing = await prisma.siteIncident.findFirst({
      where: { id: incidentId, siteId, organizationId: orgId },
    })
    if (!existing) return error('ERR_NOT_FOUND', 'Incident not found', 404)

    const body = await req.json() as unknown
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return error('ERR_VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }

    const { incidentDate, ...rest } = parsed.data
    const updateData: Record<string, unknown> = { ...rest }
    if (incidentDate) updateData['incidentDate'] = new Date(incidentDate)

    const incident = await prisma.siteIncident.update({ where: { id: incidentId }, data: updateData })
    void logActivity(orgId, profile.id, profile.email, 'INCIDENT_UPDATED',
      { type: 'Incident', id: incidentId },
      { siteId, title: existing.title, newStatus: parsed.data.status },
    )
    return success(incident)
  } catch (err) {
    logger.error('incidents-patch', { error: err })
    return error('ERR_UPDATE', 'Failed to update incident', 500)
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    const { id: siteId, incidentId } = await params

    const existing = await prisma.siteIncident.findFirst({
      where: { id: incidentId, siteId, organizationId: orgId },
    })
    if (!existing) return error('ERR_NOT_FOUND', 'Incident not found', 404)

    await prisma.siteIncident.delete({ where: { id: incidentId } })
    void logActivity(orgId, profile.id, profile.email, 'INCIDENT_DELETED',
      { type: 'Incident', id: incidentId },
      { siteId, title: existing.title },
    )
    return success({ deleted: true })
  } catch (err) {
    logger.error('incidents-delete', { error: err })
    return error('ERR_DELETE', 'Failed to delete incident', 500)
  }
}
