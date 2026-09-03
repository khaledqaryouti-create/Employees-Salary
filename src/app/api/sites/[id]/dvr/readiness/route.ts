import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { evaluateReadiness } from '@/lib/dvr/readiness'

interface Params { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId } = await params

    logger.info('dvr.readiness.start', { orgId, siteId })
    const result = await evaluateReadiness(orgId, siteId)
    logger.info('dvr.readiness.done', { orgId, siteId, found: Boolean(result) })

    if (!result) return error('NOT_FOUND', 'Site not found', 404)

    return success(result)
  } catch (err) {
    logger.error('dvr.readiness.error', { error: err })
    return handlePrismaError(err)
  }
}
