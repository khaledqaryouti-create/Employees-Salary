import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'

interface Params { params: Promise<{ id: string; taskId: string; hazardCode: string }> }

const bodySchema = z.object({
  probability:         z.number().int().min(1).max(4).nullable().optional(),
  damage:              z.number().int().min(1).max(4).nullable().optional(),
  mitigationMeasures:  z.string().nullable().optional(),
  residualProbability: z.number().int().min(1).max(4).nullable().optional(),
  residualDamage:      z.number().int().min(1).max(4).nullable().optional(),
})

function riskClass(level: number | null): string | null {
  if (level === null) return null
  if (level <= 3)  return 'LOW'
  if (level <= 8)  return 'MEDIUM'
  return 'HIGH'
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId, taskId, hazardCode } = await params

    // Verify the site belongs to this org, then verify the task belongs to this site
    const site = await prisma.site.findFirst({ where: { id: siteId, organizationId: orgId } })
    if (!site) return error('NOT_FOUND', 'Site not found', 404)

    const task = await prisma.siteTask.findFirst({
      where: { id: taskId, activity: { process: { siteId } } },
    })
    if (!task) return error('NOT_FOUND', 'Task not found', 404)

    const screening = await prisma.taskHazardScreening.findUnique({
      where: { taskId_hazardCode: { taskId, hazardCode } },
    })
    if (!screening) return error('NOT_FOUND', 'Hazard screening record not found', 404)

    const body   = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const { probability, damage, mitigationMeasures, residualProbability, residualDamage } = parsed.data

    const p = probability ?? null
    const d = damage ?? null
    const riskLevel = (p !== null && d !== null) ? p * d : null

    const rp = residualProbability ?? null
    const rd = residualDamage ?? null
    const residualRiskLevel = (rp !== null && rd !== null) ? rp * rd : null

    const updated = await prisma.taskHazardScreening.update({
      where: { id: screening.id },
      data: {
        probability:         p,
        damage:              d,
        riskLevel,
        riskClass:           riskClass(riskLevel),
        mitigationMeasures:  mitigationMeasures ?? null,
        residualProbability: rp,
        residualDamage:      rd,
        residualRiskLevel,
        residualRiskClass:   riskClass(residualRiskLevel),
      },
    })

    return success(updated)
  } catch (err) {
    logger.error('sites.tasks.hazards.risk-patch', { error: err })
    return handlePrismaError(err)
  }
}
