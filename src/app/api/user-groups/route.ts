import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'

const ADMIN_ROLES = ['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN']

const createSchema = z.object({
  name:        z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional().nullable(),
  isActive:    z.boolean().optional().default(true),
})

export async function GET() {
  try {
    const { orgId } = await getProfileOrRedirect()

    const groups = await prisma.userGroup.findMany({
      where: { organizationId: orgId },
      include: {
        _count: { select: { members: true } },
        permissions: { select: { pageKey: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(groups)
  } catch (err) {
    console.error('[GET /api/user-groups]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile, orgId } = await getProfileOrRedirect()

    if (!ADMIN_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body: unknown = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    const group = await prisma.userGroup.create({
      data: { ...parsed.data, organizationId: orgId },
    })

    await logActivity(orgId, profile.id, profile.email, 'USER_GROUP_CREATED', { type: 'UserGroup', id: group.id }, { name: group.name })

    return NextResponse.json(group, { status: 201 })
  } catch (err) {
    console.error('[POST /api/user-groups]', err)
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'A role group with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
