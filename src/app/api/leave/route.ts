import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { z } from 'zod'

const createSchema = z.object({
  leaveTypeId: z.string().min(1, 'Leave type is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().max(500).optional(),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return error('UNAUTHORIZED', 'Authentication required', 401)

    const profile = await prisma.profile.findUnique({ where: { id: user.id } })
    if (!profile || !profile.organizationId) return error('FORBIDDEN', 'No organization assigned', 403)

    const isEmployee = profile.role === 'EMPLOYEE'
    const employee = isEmployee
      ? await prisma.employee.findFirst({
          where: { profile: { id: profile.id }, organizationId: profile.organizationId },
          select: { id: true },
        })
      : null

    const requests = await prisma.leaveRequest.findMany({
      where: {
        ...(isEmployee && employee
          ? { employeeId: employee.id }
          : { employee: { organizationId: profile.organizationId } }),
      },
      include: {
        employee: { select: { fullName: true, employeeNumber: true } },
        leaveType: { select: { name: true, color: true, maxDaysPerYear: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return success(requests)
  } catch (err) {
    logger.error('GET /api/leave failed', { error: err })
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

    const body: unknown = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return error('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 400)
    }

    const { leaveTypeId, startDate, endDate, reason } = parsed.data

    // Find the employee record for this user
    const employee = await prisma.employee.findFirst({
      where: { profile: { id: profile.id }, organizationId: profile.organizationId },
      select: { id: true },
    })

    // HR can submit on behalf of any employee (future: support employeeId param)
    if (!employee) {
      return error('FORBIDDEN', 'No employee record found for your account', 403)
    }

    const startDateParsed = new Date(startDate)
    const endDateParsed = new Date(endDate)

    if (endDateParsed < startDateParsed) {
      return error('VALIDATION', 'End date must be after start date', 400)
    }

    // Check for overlapping leave
    const overlap = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: employee.id,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          { startDate: { lte: endDateParsed }, endDate: { gte: startDateParsed } },
        ],
      },
    })

    if (overlap) {
      return error('CONFLICT', 'You already have a leave request overlapping these dates', 409)
    }

    const daysCount = Math.ceil(
      (endDateParsed.getTime() - startDateParsed.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveTypeId,
        startDate: startDateParsed,
        endDate: endDateParsed,
        days: daysCount,
        reason: reason ?? null,
        status: 'PENDING',
      },
    })

    logger.info('Leave request submitted', {
      requestId: leaveRequest.id,
      employeeId: employee.id,
      orgId: profile.organizationId,
    })

    return success(leaveRequest)
  } catch (err) {
    logger.error('POST /api/leave failed', { error: err })
    return handlePrismaError(err)
  }
}
