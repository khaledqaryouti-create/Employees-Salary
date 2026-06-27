import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const createSchema = z.object({
  classificationId: z.string().min(1, 'Classification is required'),
  name:             z.string().min(1, 'Name is required').max(200),
  nameAr:           z.string().max(200).nullable().optional(),
  description:      z.string().max(500).nullable().optional(),
  isActive:         z.boolean().optional().default(true),
})

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await getProfileOrRedirect()

    const { searchParams } = new URL(req.url)
    const search           = searchParams.get('search') ?? ''
    const classificationId = searchParams.get('classificationId') ?? ''
    const activeOnly       = searchParams.get('activeOnly') === 'true'

    const competencies = await prisma.competency.findMany({
      where: {
        organizationId: orgId,
        ...(classificationId ? { classificationId } : {}),
        ...(activeOnly        ? { isActive: true }  : {}),
        ...(search ? {
          OR: [
            { name:        { contains: search, mode: 'insensitive' } },
            { nameAr:      { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      include: { classification: { select: { id: true, name: true } } },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json({ ok: true, data: competencies })
  } catch (e) {
    console.error('[GET /api/competencies]', e)
    return NextResponse.json({ error: 'Failed to load competencies' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { profile, orgId } = await getProfileOrRedirect()

    if (!ADMIN_ROLES.has(profile.role)) {
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

    const classification = await prisma.competencyClassification.findFirst({
      where: { id: parsed.data.classificationId, organizationId: orgId },
    })
    if (!classification) {
      return NextResponse.json({ error: 'Classification not found' }, { status: 404 })
    }

    const competency = await prisma.competency.create({
      data: { ...parsed.data, organizationId: orgId },
      include: { classification: { select: { id: true, name: true } } },
    })

    await logActivity(orgId, profile.id, profile.email, 'COMPETENCY_CREATED',
      { type: 'Competency', id: competency.id },
      { name: competency.name, classification: classification.name })

    return NextResponse.json({ ok: true, data: competency }, { status: 201 })
  } catch (e: unknown) {
    console.error('[POST /api/competencies]', e)
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'A competency with this name already exists in the selected classification' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create competency' }, { status: 500 })
  }
}
