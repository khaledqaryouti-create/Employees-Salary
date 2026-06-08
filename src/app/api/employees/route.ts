import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { z } from 'zod'

const createEmployeeSchema = z.object({
  employeeNumber: z.string().min(1, 'Employee number is required'),
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  nationality: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
  employmentType: z.enum(['LOCAL', 'EXPATRIATE', 'CONTRACT', 'PART_TIME']),
  joinDate: z.string().min(1, 'Join date is required'),
  basicSalary: z.number().positive('Salary must be positive'),
  currency: z.string().default('USD'),
})

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return error('UNAUTHORIZED', 'Authentication required', 401)

    const profile = await prisma.profile.findUnique({ where: { id: user.id } })
    if (!profile?.organizationId) return error('FORBIDDEN', 'No organization assigned', 403)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
    const search = searchParams.get('search') ?? ''
    const country = searchParams.get('country') ?? ''

    const where = {
      organizationId: profile.organizationId,
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { employeeNumber: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(country && { country }),
    }

    const [data, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        include: { salaryStructure: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.employee.count({ where }),
    ])

    return success({ data, total, page, limit })
  } catch (err) {
    logger.error('GET /api/employees failed', { error: err })
    return handlePrismaError(err)
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return error('UNAUTHORIZED', 'Authentication required', 401)

    const profile = await prisma.profile.findUnique({ where: { id: user.id } })
    if (!profile?.organizationId) return error('FORBIDDEN', 'No organization assigned', 403)
    if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'].includes(profile.role)) {
      return error('FORBIDDEN', 'You do not have permission to add employees', 403)
    }

    const body: unknown = await request.json()
    const parsed = createEmployeeSchema.safeParse(body)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return error('VALIDATION', firstIssue?.message ?? 'Invalid input', 400, firstIssue?.path.join('.'))
    }

    const { basicSalary, currency, ...employeeData } = parsed.data

    const employee = await prisma.employee.create({
      data: {
        ...employeeData,
        organizationId: profile.organizationId,
        joinDate: new Date(employeeData.joinDate),
        salaryStructure: {
          create: {
            basicSalary,
            currency,
          },
        },
      },
      include: { salaryStructure: true },
    })

    logger.info('Employee created', { orgId: profile.organizationId, employeeId: employee.id, userId: user.id })
    return success(employee)
  } catch (err) {
    logger.error('POST /api/employees failed', { error: err })
    return handlePrismaError(err)
  }
}
