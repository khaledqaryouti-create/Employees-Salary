import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { inngest } from '@/lib/inngest/client'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const schema = z.object({
  periodStart: z.string().min(1),
  periodEnd:   z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const { orgId, profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const body   = await request.json() as unknown
    const parsed = schema.parse(body)

    await inngest.send({
      name: 'project/costs.calculate',
      data: {
        organizationId: orgId,
        periodStart:    parsed.periodStart,
        periodEnd:      parsed.periodEnd,
      },
    })

    return success({ queued: true, periodStart: parsed.periodStart, periodEnd: parsed.periodEnd })
  } catch (err) {
    logger.error('costs.recalculate', { error: err })
    return handlePrismaError(err)
  }
}
