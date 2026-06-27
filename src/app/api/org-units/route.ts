import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'

const createSchema = z.object({
  name:     z.string().min(1).max(128),
  code:     z.string().max(32).nullable().optional(),
  levelId:  z.string().min(1),
  parentId: z.string().nullable().optional(),
  order:    z.number().int().optional(),
})

export async function GET() {
  try {
    const { orgId } = await getProfileOrRedirect()
    const units = await prisma.orgUnit.findMany({
      where: { organizationId: orgId },
      orderBy: [{ level: { depth: 'asc' } }, { order: 'asc' }, { name: 'asc' }],
      include: {
        level: true,
        parent: { select: { id: true, name: true } },
        _count: { select: { employees: true, children: true } },
      },
    })
    return NextResponse.json(units)
  } catch (e) {
    console.error('[GET /api/org-units]', e)
    return NextResponse.json({ error: 'Failed to load org units' }, { status: 500 })
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
    const data = parsed.data

    const level = await prisma.orgUnitLevel.findFirst({
      where: { id: data.levelId, organizationId: orgId },
    })
    if (!level) return NextResponse.json({ error: 'Invalid level' }, { status: 400 })

    if (data.parentId) {
      const parent = await prisma.orgUnit.findFirst({
        where: { id: data.parentId, organizationId: orgId },
      })
      if (!parent) return NextResponse.json({ error: 'Invalid parent' }, { status: 400 })
    }

    const unit = await prisma.orgUnit.create({
      data: {
        name:           data.name,
        code:           data.code ?? null,
        levelId:        data.levelId,
        parentId:       data.parentId ?? null,
        order:          data.order ?? 0,
        organizationId: orgId,
      },
      include: {
        level: true,
        parent: { select: { id: true, name: true } },
        _count: { select: { employees: true, children: true } },
      },
    })

    await logActivity(orgId, profile.id, profile.email, 'ORG_UNIT_CREATED',
      { type: 'OrgUnit', id: unit.id }, { name: unit.name, level: level.name })

    return NextResponse.json(unit, { status: 201 })
  } catch (e) {
    console.error('[POST /api/org-units]', e)
    return NextResponse.json({ error: 'Failed to create org unit' }, { status: 500 })
  }
}
