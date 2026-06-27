import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'

const createSchema = z.object({
  name:        z.string().min(1, 'Name is required').max(100),
  nameAr:      z.string().nullable().optional(),
  description: z.string().nullable().optional(),
})

export async function GET() {
  try {
    const { orgId } = await getProfileOrRedirect()

    const families = await prisma.jobFamily.findMany({
      where: { organizationId: orgId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { jobTitles: true } } },
    })

    return NextResponse.json({ ok: true, data: families })
  } catch (e) {
    console.error('[GET /api/job-families]', e)
    return NextResponse.json({ error: 'Failed to load job families' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { profile, orgId } = await getProfileOrRedirect()

    if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const family = await prisma.jobFamily.create({
      data: {
        ...parsed.data,
        organizationId: orgId,
      },
      include: { _count: { select: { jobTitles: true } } },
    })

    await logActivity(orgId, profile.id, profile.email, 'JOB_FAMILY_CREATED',
      { type: 'JobFamily', id: family.id }, { name: family.name })

    return NextResponse.json({ ok: true, data: family }, { status: 201 })
  } catch (e: unknown) {
    console.error('[POST /api/job-families]', e)
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'A job family with this name already exists' }, { status: 409 })
    }
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'development' && e instanceof Error ? e.message : 'Failed to create job family' },
      { status: 500 }
    )
  }
}
