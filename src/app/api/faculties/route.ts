import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'

const ADMIN_ROLES = ['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN']

const createSchema = z.object({
  universityId: z.string().min(1, 'University is required'),
  name:         z.string().min(1, 'Name is required').max(200),
  nameAr:       z.string().max(200).nullable().optional(),
  isActive:     z.boolean().optional().default(true),
})

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await getProfileOrRedirect()

    const { searchParams } = new URL(req.url)
    const search       = searchParams.get('search') ?? ''
    const universityId = searchParams.get('universityId') ?? ''
    const activeOnly   = searchParams.get('activeOnly') === 'true'

    const faculties = await prisma.faculty.findMany({
      where: {
        organizationId: orgId,
        ...(universityId ? { universityId } : {}),
        ...(activeOnly   ? { isActive: true } : {}),
        ...(search ? {
          OR: [
            { name:   { contains: search, mode: 'insensitive' } },
            { nameAr: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      include: { university: { select: { id: true, name: true } } },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json({ ok: true, data: faculties })
  } catch (e) {
    console.error('[GET /api/faculties]', e)
    return NextResponse.json({ error: 'Failed to load faculties' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { profile, orgId } = await getProfileOrRedirect()

    if (!ADMIN_ROLES.includes(profile.role)) {
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

    const university = await prisma.university.findFirst({
      where: { id: parsed.data.universityId, organizationId: orgId },
    })
    if (!university) {
      return NextResponse.json({ error: 'University not found' }, { status: 404 })
    }

    const faculty = await prisma.faculty.create({
      data: { ...parsed.data, organizationId: orgId },
      include: { university: { select: { id: true, name: true } } },
    })

    await logActivity(orgId, profile.id, profile.email, 'FACULTY_CREATED',
      { type: 'Faculty', id: faculty.id }, { name: faculty.name, university: university.name })

    return NextResponse.json({ ok: true, data: faculty }, { status: 201 })
  } catch (e: unknown) {
    console.error('[POST /api/faculties]', e)
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'A faculty with this name already exists in the selected university' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create faculty' }, { status: 500 })
  }
}
