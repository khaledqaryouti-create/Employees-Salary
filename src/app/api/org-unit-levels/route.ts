import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'

const createSchema = z.object({
  name:  z.string().min(1).max(64),
  depth: z.number().int().min(0),
  color: z.string().nullable().optional(),
})

export async function GET() {
  try {
    const { orgId } = await getProfileOrRedirect()
    const levels = await prisma.orgUnitLevel.findMany({
      where: { organizationId: orgId },
      orderBy: { depth: 'asc' },
      include: { _count: { select: { units: true } } },
    })
    return NextResponse.json(levels)
  } catch (e) {
    console.error('[GET /api/org-unit-levels]', e)
    return NextResponse.json({ error: 'Failed to load levels' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { profile, orgId } = await getProfileOrRedirect()
    const body = await req.json()

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const level = await prisma.orgUnitLevel.create({
      data: { ...parsed.data, organizationId: orgId },
      include: { _count: { select: { units: true } } },
    })

    await logActivity(orgId, profile.id, profile.email, 'ORG_LEVEL_CREATED',
      { type: 'OrgUnitLevel', id: level.id }, { name: level.name, depth: level.depth })

    return NextResponse.json(level, { status: 201 })
  } catch (e) {
    console.error('[POST /api/org-unit-levels]', e)
    return NextResponse.json({ error: 'Failed to create level' }, { status: 500 })
  }
}
