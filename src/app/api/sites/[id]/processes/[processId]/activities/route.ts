import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'

interface Params { params: Promise<{ id: string; processId: string }> }

const createSchema = z.object({
  name:        z.string().min(1),
  description: z.string().optional(),
})

export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id: siteId, processId } = await params

    const proc = await prisma.siteProcess.findFirst({
      where: { id: processId, siteId, organizationId: orgId },
    })
    if (!proc) return error('NOT_FOUND', 'Process not found', 404)

    const body   = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)

    const activity = await prisma.siteActivity.create({
      data: {
        processId,
        name:        parsed.data.name,
        description: parsed.data.description ?? null,
      },
    })

    return success(activity)
  } catch (err) {
    logger.error('sites.activities.create', { error: err })
    return handlePrismaError(err)
  }
}
