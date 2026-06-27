import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { createAdminClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/system-log'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const createUserSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email:    z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role:     z.enum(['TENANT_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE']),
  branchId: z.string().optional().nullable(),
  groupId:  z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const { profile, orgId } = await getProfileOrRedirect()

    if (!ADMIN_ROLES.has(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? ''

    const users = await prisma.profile.findMany({
      where: {
        organizationId: orgId,
        ...(search && {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email:    { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        branch:     { select: { id: true, name: true } },
        userGroups: { include: { group: { select: { id: true, name: true } } } },
      },
      orderBy: { fullName: 'asc' },
    })

    return NextResponse.json(users)
  } catch (err) {
    console.error('[GET /api/settings/users]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile, orgId } = await getProfileOrRedirect()

    if (!ADMIN_ROLES.has(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body: unknown = await request.json()
    const parsed = createUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    const { fullName, email, password, role, branchId, groupId } = parsed.data

    const existing = await prisma.profile.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 })
    }

    const adminClient = createAdminClient()
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, organization_id: orgId, role },
    })

    if (createError) {
      console.error('Supabase createUser error', createError)
      return NextResponse.json({ error: `Could not create user: ${createError.message}` }, { status: 500 })
    }

    const newUserId = createData.user.id

    const newProfile = await prisma.profile.create({
      data: {
        id:             newUserId,
        email,
        fullName,
        role,
        organizationId: orgId,
        branchId:       branchId ?? null,
        isActive:       true,
      },
    })

    if (groupId) {
      const groupExists = await prisma.userGroup.findFirst({ where: { id: groupId, organizationId: orgId } })
      if (groupExists) {
        await prisma.profileUserGroup.create({ data: { profileId: newUserId, groupId } })
      }
    }

    await logActivity(orgId, profile.id, profile.email, 'USER_CREATED', { type: 'Profile', id: newUserId }, { email, role })

    return NextResponse.json(newProfile, { status: 201 })
  } catch (err) {
    console.error('[POST /api/settings/users]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
