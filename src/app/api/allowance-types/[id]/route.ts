import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const updateSchema = z.object({
  name:        z.string().min(1).max(200).optional(),
  nameAr:      z.string().max(200).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  isActive:    z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { profile, orgId } = await getProfileOrRedirect()

    if (!ADMIN_ROLES.has(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.allowanceType.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Allowance type not found' }, { status: 404 })
    }

    const body   = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const updated = await prisma.allowanceType.update({
      where: { id },
      data:  parsed.data,
    })

    await logActivity(orgId, profile.id, profile.email, 'ALLOWANCE_TYPE_UPDATED',
      { type: 'AllowanceType', id: updated.id }, parsed.data)

    return NextResponse.json({ ok: true, data: updated })
  } catch (e: unknown) {
    console.error('[PATCH /api/allowance-types/[id]]', e)
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'An allowance type with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to update allowance type' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { profile, orgId } = await getProfileOrRedirect()

    if (!ADMIN_ROLES.has(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.allowanceType.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Allowance type not found' }, { status: 404 })
    }

    await prisma.allowanceType.delete({ where: { id } })

    await logActivity(orgId, profile.id, profile.email, 'ALLOWANCE_TYPE_DELETED',
      { type: 'AllowanceType', id }, { name: existing.name })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE /api/allowance-types/[id]]', e)
    return NextResponse.json({ error: 'Failed to delete allowance type' }, { status: 500 })
  }
}
