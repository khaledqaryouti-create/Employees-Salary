import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'

const ADMIN_ROLES = ['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN']

const permissionRowSchema = z.object({
  pageKey:    z.string().min(1),
  canView:    z.boolean(),
  canCreate:  z.boolean(),
  canEdit:    z.boolean(),
  canDelete:  z.boolean(),
  canApprove: z.boolean(),
})

const putSchema = z.object({
  permissions: z.array(permissionRowSchema),
})

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { orgId } = await getProfileOrRedirect()

    const group = await prisma.userGroup.findFirst({ where: { id, organizationId: orgId } })
    if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const permissions = await prisma.userGroupPermission.findMany({
      where: { groupId: id },
      orderBy: { pageKey: 'asc' },
    })

    return NextResponse.json(permissions)
  } catch (err) {
    console.error('[GET /api/user-groups/[id]/permissions]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { profile, orgId } = await getProfileOrRedirect()

    if (!ADMIN_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const group = await prisma.userGroup.findFirst({ where: { id, organizationId: orgId } })
    if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body: unknown = await request.json()
    const parsed = putSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    await prisma.$transaction([
      prisma.userGroupPermission.deleteMany({ where: { groupId: id } }),
      prisma.userGroupPermission.createMany({
        data: parsed.data.permissions.map((p) => ({ ...p, groupId: id })),
      }),
    ])

    await logActivity(orgId, profile.id, profile.email, 'USER_GROUP_PERMISSIONS_UPDATED', { type: 'UserGroup', id }, { name: group.name })

    const updated = await prisma.userGroupPermission.findMany({ where: { groupId: id }, orderBy: { pageKey: 'asc' } })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PUT /api/user-groups/[id]/permissions]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
