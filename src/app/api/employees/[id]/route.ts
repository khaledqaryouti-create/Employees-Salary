import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { success, error } from '@/lib/errors/api-response'
import { logActivity } from '@/lib/system-log'
import { z } from 'zod'

const updateSchema = z.object({
  firstName:      z.string().min(1).optional(),
  secondName:     z.string().nullable().optional(),
  thirdName:      z.string().nullable().optional(),
  lastName:       z.string().min(1).optional(),
  email:          z.string().email().optional(),
  phone:          z.string().optional(),
  nationality:    z.string().optional(),
  country:        z.string().optional(),
  jobTitle:       z.string().optional(),
  employmentType: z.enum(['LOCAL', 'EXPATRIATE', 'CONTRACT', 'PART_TIME']).optional(),
  managerId:      z.string().nullable().optional(),
  orgUnitId:      z.string().nullable().optional(),
  basicSalary:    z.number().positive().optional(),
  currency:       z.string().optional(),
})

async function getAuthProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.profile.findUnique({ where: { id: user.id } })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const profile = await getAuthProfile()
    if (!profile) return error('UNAUTHORIZED', 'Authentication required', 401)

    const orgId = profile.organizationId
    if (!orgId && profile.role !== 'SUPER_ADMIN') {
      return error('FORBIDDEN', 'No organization assigned', 403)
    }

    const employee = await prisma.employee.findFirst({
      where: {
        id,
        ...(orgId ? { organizationId: orgId } : {}),
      },
      include: {
        salaryStructure: true,
        leaveBalances: { include: { leaveType: true } },
        orgUnit: { include: { level: true, parent: { select: { id: true, name: true } } } },
      },
    })

    if (!employee) return error('NOT_FOUND', 'Employee not found', 404)
    return success({ employee })
  } catch (e) {
    console.error('[GET /api/employees/[id]]', e)
    return error('INTERNAL_SERVER_ERROR', 'Failed to fetch employee', 500)
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const profile = await getAuthProfile()
    if (!profile) return error('UNAUTHORIZED', 'Authentication required', 401)

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return error('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid data', 400)
    }

    const { basicSalary, currency, firstName, secondName, thirdName, lastName, ...rest } = parsed.data

    const employee = await prisma.employee.findFirst({
      where: { id, organizationId: profile.organizationId ?? undefined },
    })
    if (!employee) return error('NOT_FOUND', 'Employee not found', 404)

    // Recompute fullName if any name part is being updated
    const hasNameChange = firstName !== undefined || secondName !== undefined
      || thirdName !== undefined || lastName !== undefined
    const mergedFirst  = firstName  ?? employee.firstName  ?? ''
    const mergedSecond = secondName ?? employee.secondName ?? ''
    const mergedThird  = thirdName  ?? employee.thirdName  ?? ''
    const mergedLast   = lastName   ?? employee.lastName   ?? ''
    const fullName = hasNameChange
      ? [mergedFirst, mergedSecond, mergedThird, mergedLast].filter(Boolean).join(' ') || employee.fullName
      : undefined

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...rest,
        ...(firstName  !== undefined && { firstName }),
        ...(secondName !== undefined && { secondName }),
        ...(thirdName  !== undefined && { thirdName }),
        ...(lastName   !== undefined && { lastName }),
        ...(fullName   !== undefined && { fullName }),
        ...(basicSalary !== undefined && {
          salaryStructure: {
            upsert: {
              create: { basicSalary, currency: currency ?? 'USD' },
              update: { basicSalary, ...(currency && { currency }) },
            },
          },
        }),
      },
      include: { salaryStructure: true },
    })

    await logActivity(
      profile.organizationId ?? '',
      profile.id,
      profile.email,
      'EMPLOYEE_UPDATED',
      { type: 'Employee', id },
      { name: updated.fullName }
    )
    return success({ employee: updated })
  } catch (e) {
    console.error('[PATCH /api/employees/[id]]', e)
    return error('INTERNAL_SERVER_ERROR', 'Failed to update employee', 500)
  }
}
