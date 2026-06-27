import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { runPayroll } from '@/lib/payroll-engine/engine'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { getActiveBranchId } from '@/lib/auth/active-branch'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { z } from 'zod'

const createRunSchema = z.object({
  name:        z.string().optional(),
  periodMonth: z.number().int().min(1).max(12),
  periodYear:  z.number().int().min(2000).max(2100),
  currency:    z.string().default('USD'),
  force:       z.boolean().optional(),
})

export async function GET(request: Request) {
  try {
    const { orgId } = await getProfileOrRedirect()

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get('page') ?? '1')
    const limit = Math.min(Number.parseInt(searchParams.get('limit') ?? '20'), 50)

    const activeBranchId = await getActiveBranchId(orgId)
    const payrollWhere = {
      organizationId: orgId,
      ...(activeBranchId && { branchId: activeBranchId }),
    }

    const [data, total] = await Promise.all([
      prisma.payrollRun.findMany({
        where: payrollWhere,
        include: { _count: { select: { items: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.payrollRun.count({ where: payrollWhere }),
    ])

    return success({ data, total, page, limit })
  } catch (err) {
    logger.error('GET /api/payroll failed', { error: err })
    return handlePrismaError(err)
  }
}

export async function POST(request: Request) {
  try {
    const { profile, orgId } = await getProfileOrRedirect()
    if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN', 'PAYROLL_ADMIN'].includes(profile.role)) {
      return error('FORBIDDEN', 'You do not have permission to run payroll', 403)
    }
    const activeBranchIdForRun = await getActiveBranchId(orgId)

    const body: unknown = await request.json()
    const parsed = createRunSchema.safeParse(body)
    if (!parsed.success) {
      return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }

    // Check for duplicate run
    const existing = await prisma.payrollRun.findFirst({
      where: {
        organizationId: orgId,
        periodMonth: parsed.data.periodMonth,
        periodYear: parsed.data.periodYear,
        status: { in: ['PROCESSING', 'PENDING_APPROVAL', 'APPROVED', 'PAID'] },
      },
    })

    if (existing) {
      // Finalised runs can never be overridden
      if (['APPROVED', 'PAID'].includes(existing.status)) {
        return error(
          'CONFLICT',
          `This payroll run is already ${existing.status} and cannot be overridden.`,
          409
        )
      }

      if (!parsed.data.force) {
        // Return structured conflict so the UI can show the override dialog
        return NextResponse.json({
          ok: false,
          code: 'CONFLICT',
          existingStatus: existing.status,
          message: `A payroll run for ${parsed.data.periodMonth}/${parsed.data.periodYear} already exists (${existing.status})`,
        }, { status: 409 })
      }

      // force=true: delete the existing run (items cascade via onDelete: Cascade)
      await prisma.payrollRun.delete({ where: { id: existing.id } })
    }

    // Create the run record first, then process
    const newRun = await prisma.payrollRun.create({
      data: {
        organizationId: orgId,
        branchId: activeBranchIdForRun ?? undefined,
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
      orgId,
    })

    const run = await prisma.payrollRun.findUnique({ where: { id: newRun.id } })
    return success(run)
  } catch (err) {
    logger.error('POST /api/payroll failed', { error: err })
    return handlePrismaError(err)
  }
}
