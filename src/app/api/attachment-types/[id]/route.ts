import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const updateSchema = z.object({
  name:        z.string().min(1).max(150).optional(),
  nameAr:      z.string().max(150).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  isRequired:  z.boolean().optional(),
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

    const existing = await prisma.attachmentType.findFirst({ where: { id, organizationId: orgId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const updated = await prisma.attachmentType.update({ where: { id }, data: parsed.data })

    await logActivity(orgId, profile.id, profile.email, 'ATTACHMENT_TYPE_UPDATED',
      { type: 'AttachmentType', id }, { name: updated.name })

    return NextResponse.json({ ok: true, data: updated })
  } catch (e: unknown) {
    console.error('[PATCH /api/attachment-types/[id]]', e)
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'An attachment type with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to update attachment type' }, { status: 500 })
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

    const existing = await prisma.attachmentType.findFirst({ where: { id, organizationId: orgId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.attachmentType.delete({ where: { id } })

    await logActivity(orgId, profile.id, profile.email, 'ATTACHMENT_TYPE_DELETED',
      { type: 'AttachmentType', id }, { name: existing.name })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE /api/attachment-types/[id]]', e)
    return NextResponse.json({ error: 'Failed to delete attachment type' }, { status: 500 })
  }
}
