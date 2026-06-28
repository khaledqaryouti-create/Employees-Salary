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
    const { id } = await params
    const { profile, orgId } = await getProfileOrRedirect()

    if (!ADMIN_ROLES.has(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const existing = await prisma.deductionType.findFirst({ where: { id, organizationId: orgId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const updated = await prisma.deductionType.update({
      where: { id },
      data: parsed.data,
    })

    await logActivity(orgId, profile.id, profile.email, 'DEDUCTION_TYPE_UPDATED',
      { type: 'DeductionType', id }, { name: updated.name })

    return NextResponse.json({ ok: true, data: updated })
  } catch (e: unknown) {
    console.error('[PATCH /api/deduction-types/[id]]', e)
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'A deduction type with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to update deduction type' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { profile, orgId } = await getProfileOrRedirect()

    if (!ADMIN_ROLES.has(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const existing = await prisma.deductionType.findFirst({ where: { id, organizationId: orgId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.deductionType.delete({ where: { id } })

    await logActivity(orgId, profile.id, profile.email, 'DEDUCTION_TYPE_DELETED',
      { type: 'DeductionType', id }, { name: existing.name })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE /api/deduction-types/[id]]', e)
    return NextResponse.json({ error: 'Failed to delete deduction type' }, { status: 500 })
  }
}
