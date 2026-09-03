import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { prisma } from '@/lib/prisma/client'
import { success, error } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { logActivity } from '@/lib/system-log'

const createSchema = z.object({
  incidentType: z.enum(['ACCIDENT', 'NEAR_MISS', 'DANGEROUS_OCCURRENCE', 'OCCUPATIONAL_DISEASE']),
  severity: z.enum(['FATAL', 'MAJOR', 'MINOR', 'FIRST_AID_ONLY', 'NO_INJURY']),
  incidentDate: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  injuredPerson: z.string().nullable().optional(),
  witnesses: z.string().nullable().optional(),
  immediateAction: z.string().nullable().optional(),
  hazardId: z.string().nullable().optional(),
})

interface Params { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId } = await params
    const { searchParams } = new URL(req.url)

    const where: Record<string, unknown> = { siteId, organizationId: orgId }
    const typeFilter = searchParams.get('type')
    const statusFilter = searchParams.get('status')
    const severityFilter = searchParams.get('severity')
    if (typeFilter) where['incidentType'] = typeFilter
    if (statusFilter) where['status'] = statusFilter
    if (severityFilter) where['severity'] = severityFilter

    const incidents = await prisma.siteIncident.findMany({
      where,
      orderBy: { incidentDate: 'desc' },
      include: {
        hazard: { select: { hazardCode: true } },
      },
    })

    return success(incidents)
  } catch (err) {
    logger.error('incidents-get', { error: err })
    return error('ERR_FETCH', 'Failed to fetch incidents', 500)
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { orgId, user } = await getProfileOrRedirect()
    const { id: siteId } = await params
    const body = await req.json() as unknown
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return error('ERR_VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }

    const incident = await prisma.siteIncident.create({
      data: {
        organizationId: orgId,
        siteId,
        incidentType: parsed.data.incidentType,
        severity: parsed.data.severity,
        incidentDate: new Date(parsed.data.incidentDate),
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        location: parsed.data.location ?? null,
        injuredPerson: parsed.data.injuredPerson ?? null,
        witnesses: parsed.data.witnesses ?? null,
        immediateAction: parsed.data.immediateAction ?? null,
        hazardId: parsed.data.hazardId ?? null,
        createdById: user.id,
      },
    })

    void logActivity(orgId, user.id, user.email ?? null, 'INCIDENT_REPORTED',
      { type: 'Incident', id: incident.id },
      { siteId, title: incident.title, incidentType: incident.incidentType, severity: incident.severity },
    )
    return success(incident)
  } catch (err) {
    logger.error('incidents-post', { error: err })
    return error('ERR_CREATE', 'Failed to create incident', 500)
  }
}
