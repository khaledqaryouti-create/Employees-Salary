import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

interface Params { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Params) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const { id: siteId } = await params

    const site = await prisma.site.findFirst({ where: { id: siteId, organizationId: orgId } })
    if (!site) return error('NOT_FOUND', 'Site not found', 404)

    // Find all HIGH-risk applicable hazards that don't already have a corrective action
    const hazards = await prisma.taskHazardScreening.findMany({
      where: {
        isApplicable:     true,
        riskClass:        'HIGH',
        task:             { activity: { process: { siteId } } },
        correctiveActions: { none: {} },
      },
      include: {
        task: { select: { name: true } },
      },
    })

    if (hazards.length === 0) {
      return success({ created: 0, message: 'All HIGH-risk hazards already have corrective actions.' })
    }

    const HAZARD_LABELS: Record<string, string> = {
      R01: 'Falls from height',
      R02: 'Slips, trips and falls on the same level',
      R03: 'Struck by moving objects',
      R04: 'Struck against objects',
      R05: 'Contact with moving machinery',
      R06: 'Cuts, punctures and abrasions',
      R07: 'Manual handling / musculoskeletal',
      R08: 'Chemical agents',
      R09: 'Biological agents',
      R10: 'Noise and vibration',
      R11: 'Extreme temperatures',
      R12: 'Electrical hazards',
      R13: 'Fire and explosion',
      R14: 'Radiation',
      R15: 'Confined spaces',
      R16: 'Ergonomic hazards',
      R17: 'Psychosocial hazards',
      R18: 'Work at height / scaffolding',
      R19: 'Driving and transport',
      R20: 'Contractor and third-party interaction',
      R21: 'Environmental hazards',
      R22: 'Emergency situations',
    }

    await prisma.correctiveAction.createMany({
      data: hazards.map((h) => ({
        organizationId: orgId,
        siteId,
        hazardId:       h.id,
        title:          `Mitigate ${h.hazardCode} — ${HAZARD_LABELS[h.hazardCode] ?? h.hazardCode} (${h.task.name})`,
        description:    h.mitigationMeasures
          ? `Current mitigation: ${h.mitigationMeasures}. Implement additional controls to reduce residual risk.`
          : 'Define and implement risk controls to reduce the residual risk to MEDIUM or LOW.',
        priority:    'CRITICAL',
        status:      'OPEN',
        createdById: profile.id,
      })),
    })

    void logActivity(orgId, profile.id, profile.email, 'CORRECTIVE_ACTIONS_GENERATED',
      { type: 'Site', id: siteId },
      { siteId, siteName: site.name, count: hazards.length },
    )
    return success({ created: hazards.length })
  } catch (err) {
    logger.error('corrective-actions.generate', { error: err })
    return handlePrismaError(err)
  }
}
