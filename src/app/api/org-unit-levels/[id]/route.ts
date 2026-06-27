import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'

const updateSchema = z.object({
  name:  z.string().min(1).max(64).optional(),
  depth: z.number().int().min(0).optional(),
  color: z.string().nullable().optional(),
})

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

    const existing = await prisma.orgUnitLevel.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await prisma.orgUnitLevel.update({
      where: { id },
      data: parsed.data,
      include: { _count: { select: { units: true } } },
    })

    await logActivity(orgId, profile.id, profile.email, 'ORG_LEVEL_UPDATED',
      { type: 'OrgUnitLevel', id }, { name: updated.name })

    return NextResponse.json(updated)
  } catch (e) {
    console.error('[PATCH /api/org-unit-levels/[id]]', e)
    return NextResponse.json({ error: 'Failed to update level' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { profile, orgId } = await getProfileOrRedirect()
    const { id } = await params

    const existing = await prisma.orgUnitLevel.findFirst({
      where: { id, organizationId: orgId },
      include: { _count: { select: { units: true } } },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing._count.units > 0) {
      return NextResponse.json(
        { error: 'Cannot delete a level that has units assigned to it.' },
        { status: 400 }
      )
    }

    await prisma.orgUnitLevel.delete({ where: { id } })

    await logActivity(orgId, profile.id, profile.email, 'ORG_LEVEL_DELETED',
      { type: 'OrgUnitLevel', id }, { name: existing.name })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE /api/org-unit-levels/[id]]', e)
    return NextResponse.json({ error: 'Failed to delete level' }, { status: 500 })
  }
}
