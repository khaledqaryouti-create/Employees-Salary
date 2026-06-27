import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { logActivity } from '@/lib/system-log'
import { getActiveBranchId } from '@/lib/auth/active-branch'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { z } from 'zod'

const createEmployeeSchema = z.object({
  employeeNumber: z.string().min(1, 'Employee number is required'),
  firstName:      z.string().min(1, 'First name is required'),
  secondName:     z.string().optional(),
  thirdName:      z.string().optional(),
  lastName:       z.string().min(1, 'Last name is required'),
  email:          z.string().email('Invalid email address'),
  phone:          z.string().optional(),
  nationality:    z.string().optional(),
  country:        z.string().min(1, 'Country is required'),
  jobTitle:       z.string().optional(),
  orgUnitId:      z.string().optional(),
  employmentType: z.enum(['LOCAL', 'EXPATRIATE', 'CONTRACT', 'PART_TIME']),
  joinDate:       z.string().min(1, 'Join date is required'),
  basicSalary:    z.coerce.number().nonnegative().optional().default(0),
  currency:       z.string().default('USD'),
})

export async function GET(request: Request) {
  try {
    const { orgId } = await getProfileOrRedirect()

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get('page') ?? '1')
    const limit = Math.min(Number.parseInt(searchParams.get('limit') ?? '50'), 100)
    const search = searchParams.get('search') ?? ''
    const country = searchParams.get('country') ?? ''

    // Apply branch scoping: filter employees whose orgUnit belongs to the active branch
    const activeBranchId = await getActiveBranchId(orgId)

    const where = {
      organizationId: orgId,
      ...(activeBranchId && {
        orgUnit: { branchId: activeBranchId },
      }),
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
        include: { salaryStructure: true, orgUnit: { select: { name: true } } },
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
    const { profile, orgId, user } = await getProfileOrRedirect()
    if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'].includes(profile.role)) {
      return error('FORBIDDEN', 'You do not have permission to add employees', 403)
    }

    const body: unknown = await request.json()
    const parsed = createEmployeeSchema.safeParse(body)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return error('VALIDATION', firstIssue?.message ?? 'Invalid input', 400, firstIssue?.path.join('.'))
    }

    const { basicSalary, currency, firstName, secondName, thirdName, lastName, ...rest } = parsed.data
    const fullName = [firstName, secondName, thirdName, lastName].filter(Boolean).join(' ')
    const employeeData = { ...rest, firstName, secondName, thirdName, lastName, fullName }

    const employee = await prisma.employee.create({
      data: {
        ...employeeData,
        organizationId: orgId,
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

    logger.info('Employee created', { orgId, employeeId: employee.id, userId: user.id })
    await logActivity(
      orgId,
      profile.id,
      profile.email,
      'EMPLOYEE_CREATED',
      { type: 'Employee', id: employee.id },
      { name: employee.fullName, employeeNumber: employee.employeeNumber }
    )
    return success(employee)
  } catch (err) {
    logger.error('POST /api/employees failed', { error: err })
    return handlePrismaError(err)
  }
}
