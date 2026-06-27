import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import { error, handlePrismaError } from '@/lib/errors/api-response'
import { logger } from '@/lib/errors/logger'
import { logActivity } from '@/lib/system-log'

const updateSchema = z.object({
  name:           z.string().min(1).optional(),
  nameAr:         z.string().nullable().optional(),
  color:          z.string().nullable().optional(),
  isPaid:         z.boolean().optional(),
  defaultDays:    z.coerce.number().int().min(0).optional(),
  maxDaysPerYear: z.coerce.number().int().min(0).nullable().optional(),
  carryOverDays:  z.coerce.number().int().min(0).optional(),
  isActive:       z.boolean().optional(),
})

async function getAuthorizedProfile(adminOnly = true) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile?.organizationId) return null
  if (adminOnly && !['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'].includes(profile.role)) return null

  return profile
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const profile = await getAuthorizedProfile()
    if (!profile) return error('FORBIDDEN', 'Insufficient permissions', 403)

    // Verify the leave type belongs to this org
    const existing = await prisma.leaveType.findFirst({
      where: { id, organizationId: profile.organizationId },
    })
    if (!existing) return error('NOT_FOUND', 'Leave type not found', 404)

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return error('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid data', 400)
    }

    const updated = await prisma.leaveType.update({
      where: { id },
      data: parsed.data,
    })

    await logActivity(
      profile.organizationId ?? '',
      profile.id,
      profile.email,
      'LEAVE_TYPE_UPDATED',
      { type: 'LeaveType', id },
      { name: updated.name }
    )

    return NextResponse.json({ ok: true, data: updated })
  } catch (err) {
    logger.error('PATCH /api/leave/types/[id] failed', { error: err })
    return handlePrismaError(err)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const profile = await getAuthorizedProfile()
    if (!profile) return error('FORBIDDEN', 'Insufficient permissions', 403)

    const existing = await prisma.leaveType.findFirst({
      where: { id, organizationId: profile.organizationId },
      include: { _count: { select: { requests: true, balances: true } } },
    })
    if (!existing) return error('NOT_FOUND', 'Leave type not found', 404)

    const usageCount = existing._count.requests + existing._count.balances
    if (usageCount > 0) {
      return error(
        'CONFLICT',
        `Cannot delete — this leave type has ${existing._count.requests} request(s) and ${existing._count.balances} balance(s). Deactivate it instead.`,
        409
      )
    }

    await prisma.leaveType.delete({ where: { id } })

    await logActivity(
      profile.organizationId ?? '',
      profile.id,
      profile.email,
      'LEAVE_TYPE_DELETED',
      { type: 'LeaveType', id },
      { name: existing.name }
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('DELETE /api/leave/types/[id] failed', { error: err })
    return handlePrismaError(err)
  }
}
