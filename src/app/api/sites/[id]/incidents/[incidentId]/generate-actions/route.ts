import { NextRequest } from 'next/server'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { prisma } from '@/lib/prisma/client'
import { success, error } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { logActivity } from '@/lib/system-log'

const SEVERITY_TO_PRIORITY: Record<string, 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'> = {
  FATAL: 'CRITICAL',
  MAJOR: 'HIGH',
  MINOR: 'MEDIUM',
  FIRST_AID_ONLY: 'LOW',
  NO_INJURY: 'LOW',
}

interface Params { params: Promise<{ id: string; incidentId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { orgId, user } = await getProfileOrRedirect()
    const { id: siteId, incidentId } = await params

    const incident = await prisma.siteIncident.findFirst({
      where: { id: incidentId, siteId, organizationId: orgId },
    })
    if (!incident) return error('ERR_NOT_FOUND', 'Incident not found', 404)

    const priority = SEVERITY_TO_PRIORITY[incident.severity] ?? 'MEDIUM'
    const dueDate = new Date()
    const isSevere = incident.severity === 'FATAL' || incident.severity === 'MAJOR'
    dueDate.setDate(dueDate.getDate() + (isSevere ? 7 : 30))

    const action = await prisma.correctiveAction.create({
      data: {
        organizationId: orgId,
        siteId,
        hazardId: incident.hazardId ?? null,
        title: `Action from incident: ${incident.title}`,
        description: `[Incident: ${incident.title}] ${isSevere ? 'Urgent corrective action required' : 'Corrective action required'} following recorded incident.`,
        priority,
        status: 'OPEN',
        dueDate,
        assignedToId: null,
        createdById: user.id,
      },
    })

    await prisma.siteIncident.update({
      where: { id: incidentId },
      data: { status: 'CORRECTIVE_ACTIONS_ASSIGNED' },
    })

    void logActivity(orgId, user.id, user.email ?? null, 'INCIDENT_ACTIONS_GENERATED',
      { type: 'Incident', id: incidentId },
      { siteId, incidentTitle: incident.title },
    )
    return success({ created: 1, action })
  } catch (err) {
    logger.error('incidents-generate-actions', { error: err })
    return error('ERR_GENERATE', 'Failed to generate corrective actions', 500)
  }
}
