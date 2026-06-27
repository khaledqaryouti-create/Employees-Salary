import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'

const updateSchema = z.object({
  name:     z.string().min(1).max(128).optional(),
  code:     z.string().max(32).nullable().optional(),
  levelId:  z.string().optional(),
  parentId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  order:    z.number().int().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await getProfileOrRedirect()
    const { id } = await params
    const unit = await prisma.orgUnit.findFirst({
      where: { id, organizationId: orgId },
      include: {
        level: true,
        parent: { select: { id: true, name: true } },
        children: { include: { level: true } },
        _count: { select: { employees: true } },
      },
    })
    if (!unit) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(unit)
  } catch (e) {
    console.error('[GET /api/org-units/[id]]', e)
    return NextResponse.json({ error: 'Failed to load org unit' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { profile, orgId } = await getProfileOrRedirect()
    const { id } = await params
    const body = await req.json()

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const existing = await prisma.orgUnit.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await prisma.orgUnit.update({
      where: { id },
      data: parsed.data,
      include: {
        level: true,
        parent: { select: { id: true, name: true } },
        _count: { select: { employees: true, children: true } },
      },
    })

    await logActivity(orgId, profile.id, profile.email, 'ORG_UNIT_UPDATED',
      { type: 'OrgUnit', id }, { name: updated.name })

    return NextResponse.json(updated)
  } catch (e) {
    console.error('[PATCH /api/org-units/[id]]', e)
    return NextResponse.json({ error: 'Failed to update org unit' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { profile, orgId } = await getProfileOrRedirect()
    const { id } = await params

    const existing = await prisma.orgUnit.findFirst({
      where: { id, organizationId: orgId },
      include: { _count: { select: { children: true, employees: true } } },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (existing._count.children > 0) {
      return NextResponse.json(
        { error: 'Cannot delete a unit that has child units. Remove children first.' },
        { status: 400 }
      )
    }
    if (existing._count.employees > 0) {
      return NextResponse.json(
        { error: 'Cannot delete a unit that has employees assigned. Reassign employees first.' },
        { status: 400 }
      )
    }

    await prisma.orgUnit.delete({ where: { id } })

    await logActivity(orgId, profile.id, profile.email, 'ORG_UNIT_DELETED',
      { type: 'OrgUnit', id }, { name: existing.name })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE /api/org-units/[id]]', e)
    return NextResponse.json({ error: 'Failed to delete org unit' }, { status: 500 })
  }
}
