import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { runPayroll } from '@/lib/payroll-engine/engine'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { z } from 'zod'

const createRunSchema = z.object({
  name: z.string().optional(),
  periodMonth: z.number().int().min(1).max(12),
  periodYear: z.number().int().min(2000).max(2100),
  currency: z.string().default('USD'),
})

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return error('UNAUTHORIZED', 'Authentication required', 401)

    const profile = await prisma.profile.findUnique({ where: { id: user.id } })
    if (!profile || !profile.organizationId) return error('FORBIDDEN', 'No organization assigned', 403)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)

    const [data, total] = await Promise.all([
      prisma.payrollRun.findMany({
        where: { organizationId: profile.organizationId },
        include: { _count: { select: { items: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.payrollRun.count({ where: { organizationId: profile.organizationId } }),
    ])

    return success({ data, total, page, limit })
  } catch (err) {
    logger.error('GET /api/payroll failed', { error: err })
    return handlePrismaError(err)
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return error('UNAUTHORIZED', 'Authentication required', 401)

    const profile = await prisma.profile.findUnique({ where: { id: user.id } })
    if (!profile || !profile.organizationId) return error('FORBIDDEN', 'No organization assigned', 403)
    if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN', 'PAYROLL_ADMIN'].includes(profile.role)) {
      return error('FORBIDDEN', 'You do not have permission to run payroll', 403)
    }
    const orgId = profile.organizationId

    const body: unknown = await request.json()
    const parsed = createRunSchema.safeParse(body)
    if (!parsed.success) {
      return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }

    // Check for duplicate run
    const existing = await prisma.payrollRun.findFirst({
      where: {
        organizationId: profile.organizationId,
        periodMonth: parsed.data.periodMonth,
        periodYear: parsed.data.periodYear,
        status: { in: ['PROCESSING', 'PENDING_APPROVAL', 'APPROVED', 'PAID'] },
      },
    })

    if (existing) {
      return error(
        'CONFLICT',
        `A payroll run for ${parsed.data.periodMonth}/${parsed.data.periodYear} already exists (${existing.status})`,
        409
      )
    }

    // Create the run record first, then process
    const newRun = await prisma.payrollRun.create({
      data: {
        organizationId: orgId,
        name: parsed.data.name,
        periodMonth: parsed.data.periodMonth,
        periodYear: parsed.data.periodYear,
        currency: parsed.data.currency,
        status: 'DRAFT',
      },
    })

    await runPayroll({
      payrollRunId: newRun.id,
      organizationId: orgId,
      periodMonth: parsed.data.periodMonth,
      periodYear: parsed.data.periodYear,
    })

    logger.info('Payroll run completed', {
      runId: newRun.id,
      orgId: profile.organizationId,
    })

    const run = await prisma.payrollRun.findUnique({ where: { id: newRun.id } })
    return success(run)
  } catch (err) {
    logger.error('POST /api/payroll failed', { error: err })
    return handlePrismaError(err)
  }
}
