import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'

const ADMIN_ROLES = ['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN']

const updateSchema = z.object({
  classificationId: z.string().min(1).optional(),
  name:             z.string().min(1).max(200).optional(),
  nameAr:           z.string().max(200).nullable().optional(),
  description:      z.string().max(500).nullable().optional(),
  isActive:         z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { profile, orgId } = await getProfileOrRedirect()

    if (!ADMIN_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const existing = await prisma.competency.findFirst({ where: { id, organizationId: orgId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    if (parsed.data.classificationId) {
      const cls = await prisma.competencyClassification.findFirst({
        where: { id: parsed.data.classificationId, organizationId: orgId },
      })
      if (!cls) return NextResponse.json({ error: 'Classification not found' }, { status: 404 })
    }

    const updated = await prisma.competency.update({
      where: { id },
      data: parsed.data,
      include: { classification: { select: { id: true, name: true } } },
    })

    await logActivity(orgId, profile.id, profile.email, 'COMPETENCY_UPDATED',
      { type: 'Competency', id }, { name: updated.name })

    return NextResponse.json({ ok: true, data: updated })
  } catch (e: unknown) {
    console.error('[PATCH /api/competencies/[id]]', e)
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'A competency with this name already exists in the selected classification' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to update competency' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { profile, orgId } = await getProfileOrRedirect()

    if (!ADMIN_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const existing = await prisma.competency.findFirst({ where: { id, organizationId: orgId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.competency.delete({ where: { id } })

    await logActivity(orgId, profile.id, profile.email, 'COMPETENCY_DELETED',
      { type: 'Competency', id }, { name: existing.name })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE /api/competencies/[id]]', e)
    return NextResponse.json({ error: 'Failed to delete competency' }, { status: 500 })
  }
}
