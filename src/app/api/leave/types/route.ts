import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { success, error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { logActivity } from '@/lib/system-log'

const createSchema = z.object({
  name:           z.string().min(1, 'Name is required'),
  nameAr:         z.string().optional(),
  color:          z.string().optional(),
  isPaid:         z.boolean().default(true),
  defaultDays:    z.coerce.number().int().min(0).default(0),
  maxDaysPerYear: z.coerce.number().int().min(0).nullable().optional(),
  carryOverDays:  z.coerce.number().int().min(0).default(0),
})

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

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return error('UNAUTHORIZED', 'Authentication required', 401)

    const profile = await prisma.profile.findUnique({ where: { id: user.id } })
    if (!profile?.organizationId) return error('FORBIDDEN', 'No organization', 403)
    if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'].includes(profile.role)) {
      return error('FORBIDDEN', 'Insufficient permissions', 403)
    }

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return error('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid data', 400)
    }

    const leaveType = await prisma.leaveType.create({
      data: {
        ...parsed.data,
        organizationId: profile.organizationId,
        isDefault: false,
        isActive: true,
      },
    })

    await logActivity(
      profile.organizationId,
      profile.id,
      profile.email,
      'LEAVE_TYPE_CREATED',
      { type: 'LeaveType', id: leaveType.id },
      { name: leaveType.name }
    )

    return NextResponse.json({ ok: true, data: leaveType }, { status: 201 })
  } catch (err) {
    logger.error('POST /api/leave/types failed', { error: err })
    return handlePrismaError(err)
  }
}
