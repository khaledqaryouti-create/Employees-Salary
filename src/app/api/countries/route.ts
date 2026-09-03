import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { z } from 'zod'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const createSchema = z.object({
  code: z.string().length(2, 'ISO code must be exactly 2 characters').toUpperCase(),
  name: z.string().min(1),
})

export async function GET(request: Request) {
  try {
    await getProfileOrRedirect()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() ?? ''

    const countries = await prisma.country.findMany({
      where: search
        ? { OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
          ] }
        : undefined,
      include: {
        _count: { select: { safetyRequirements: true, projects: true } },
      },
      orderBy: { name: 'asc' },
      take: 500,
    })
    return success(countries)
  } catch (err) {
    logger.error('countries.list', { error: err })
    return handlePrismaError(err)
  }
}

export async function POST(request: Request) {
  try {
    const { profile } = await getProfileOrRedirect()
    if (!ADMIN_ROLES.has(profile.role)) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const body   = await request.json() as unknown
    const parsed = createSchema.parse(body)

    const country = await prisma.country.create({
      data: { code: parsed.code, name: parsed.name },
    })
    return success(country)
  } catch (err) {
    logger.error('countries.create', { error: err })
    return handlePrismaError(err)
  }
}
