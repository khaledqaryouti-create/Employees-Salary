import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return error('UNAUTHORIZED', 'Authentication required', 401)

    const profile = await prisma.profile.findUnique({ where: { id: user.id } })
    if (!profile?.organizationId) return error('FORBIDDEN', 'No organization', 403)

    const types = await prisma.leaveType.findMany({
      where: {
        OR: [
          { organizationId: profile.organizationId },
          { isDefault: true },
        ],
      },
      orderBy: { name: 'asc' },
    })

    return success(types)
  } catch (err) {
    logger.error('GET /api/leave/types failed', { error: err })
    return handlePrismaError(err)
  }
}
