import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'

const createSchema = z.object({
  name:         z.string().min(1, 'Name is required').max(150),
  nameAr:       z.string().nullable().optional(),
  grade:        z.string().nullable().optional(),
  mappingCode:     z.string().nullable().optional(),
  integrationCode: z.string().nullable().optional(),
  jobFamilyId:     z.string().min(1, 'Job family is required'),
})

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await getProfileOrRedirect()

    const { searchParams } = new URL(req.url)
    const familyId = searchParams.get('familyId') ?? ''

    const titles = await prisma.jobTitle.findMany({
      where: {
        organizationId: orgId,
        ...(familyId ? { jobFamilyId: familyId } : {}),
      },
      orderBy: [{ jobFamily: { name: 'asc' } }, { name: 'asc' }],
      include: {
        jobFamily: { select: { id: true, name: true } },
        _count: { select: { employees: true } },
      },
    })

    return NextResponse.json({ ok: true, data: titles })
  } catch (e) {
    console.error('[GET /api/job-titles]', e)
    return NextResponse.json({ error: 'Failed to load job titles' }, { status: 500 })
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

    // Verify family belongs to this org
    const family = await prisma.jobFamily.findFirst({
      where: { id: parsed.data.jobFamilyId, organizationId: orgId },
    })
    if (!family) {
      return NextResponse.json({ error: 'Invalid job family' }, { status: 400 })
    }

    const title = await prisma.jobTitle.create({
      data: {
        ...parsed.data,
        organizationId: orgId,
      },
      include: {
        jobFamily: { select: { id: true, name: true } },
        _count: { select: { employees: true } },
      },
    })

    await logActivity(orgId, profile.id, profile.email, 'JOB_TITLE_CREATED',
      { type: 'JobTitle', id: title.id }, { name: title.name, family: family.name })

    return NextResponse.json({ ok: true, data: title }, { status: 201 })
  } catch (e: unknown) {
    console.error('[POST /api/job-titles]', e)
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'A job title with this name already exists' }, { status: 409 })
    }
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'development' && e instanceof Error ? e.message : 'Failed to create job title' },
      { status: 500 }
    )
  }
}
