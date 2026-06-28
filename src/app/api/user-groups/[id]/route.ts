import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const updateSchema = z.object({
  name:        z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isActive:    z.boolean().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { profile, orgId } = await getProfileOrRedirect()

    if (!ADMIN_ROLES.has(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const group = await prisma.userGroup.findFirst({ where: { id, organizationId: orgId } })
    if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body: unknown = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    const updated = await prisma.userGroup.update({ where: { id }, data: parsed.data })

    await logActivity(orgId, profile.id, profile.email, 'USER_GROUP_UPDATED', { type: 'UserGroup', id }, { name: updated.name })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PATCH /api/user-groups/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { profile, orgId } = await getProfileOrRedirect()

    if (!ADMIN_ROLES.has(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const group = await prisma.userGroup.findFirst({ where: { id, organizationId: orgId } })
    if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const memberCount = await prisma.profileUserGroup.count({ where: { groupId: id } })
    if (memberCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete group with ${memberCount} assigned user(s). Remove users first.` },
        { status: 409 }
      )
    }

    await prisma.userGroup.delete({ where: { id } })

    await logActivity(orgId, profile.id, profile.email, 'USER_GROUP_DELETED', { type: 'UserGroup', id }, { name: group.name })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/user-groups/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
