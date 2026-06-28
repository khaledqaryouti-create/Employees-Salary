import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  role:     z.enum(['TENANT_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']).optional(),
  branchId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  groupId:  z.string().optional().nullable(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { profile, orgId } = await getProfileOrRedirect()

    if (!ADMIN_ROLES.has(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const target = await prisma.profile.findFirst({ where: { id, organizationId: orgId } })
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const body: unknown = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    const { groupId, ...profileData } = parsed.data

    const updated = await prisma.profile.update({ where: { id }, data: profileData })

    if (groupId !== undefined) {
      await prisma.profileUserGroup.deleteMany({ where: { profileId: id } })
      if (groupId) {
        const groupExists = await prisma.userGroup.findFirst({ where: { id: groupId, organizationId: orgId } })
        if (groupExists) {
          await prisma.profileUserGroup.create({ data: { profileId: id, groupId } })
        }
      }
    }

    await logActivity(orgId, profile.id, profile.email, 'USER_UPDATED', { type: 'Profile', id }, { email: target.email })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PATCH /api/settings/users/[id]]', err)
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

    if (id === profile.id) {
      return NextResponse.json({ error: 'Cannot deactivate your own account.' }, { status: 400 })
    }

    const target = await prisma.profile.findFirst({ where: { id, organizationId: orgId } })
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    await prisma.profile.update({ where: { id }, data: { isActive: false } })

    await logActivity(orgId, profile.id, profile.email, 'USER_DEACTIVATED', { type: 'Profile', id }, { email: target.email })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/settings/users/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
