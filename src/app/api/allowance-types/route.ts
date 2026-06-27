import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const createSchema = z.object({
  name:        z.string().min(1, 'Name is required').max(200),
  nameAr:      z.string().max(200).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  isActive:    z.boolean().optional().default(true),
})

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await getProfileOrRedirect()

    const { searchParams } = new URL(req.url)
    const search     = searchParams.get('search') ?? ''
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const allowanceTypes = await prisma.allowanceType.findMany({
      where: {
        organizationId: orgId,
        ...(activeOnly ? { isActive: true } : {}),
        ...(search ? {
          OR: [
            { name:        { contains: search, mode: 'insensitive' } },
            { nameAr:      { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json({ ok: true, data: allowanceTypes })
  } catch (e) {
    console.error('[GET /api/allowance-types]', e)
    return NextResponse.json({ error: 'Failed to load allowance types' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { profile, orgId } = await getProfileOrRedirect()

    if (!ADMIN_ROLES.has(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body   = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const allowanceType = await prisma.allowanceType.create({
      data: { ...parsed.data, organizationId: orgId },
    })

    await logActivity(orgId, profile.id, profile.email, 'ALLOWANCE_TYPE_CREATED',
      { type: 'AllowanceType', id: allowanceType.id }, { name: allowanceType.name })

    return NextResponse.json({ ok: true, data: allowanceType }, { status: 201 })
  } catch (e: unknown) {
    console.error('[POST /api/allowance-types]', e)
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'An allowance type with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create allowance type' }, { status: 500 })
  }
}
