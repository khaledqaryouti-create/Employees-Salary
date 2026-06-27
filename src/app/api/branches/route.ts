import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'

const branchSchema = z.object({
  name:                   z.string().min(1, 'Name is required').max(150),
  nameAr:                 z.string().nullable().optional(),
  code:                   z.string().max(32).nullable().optional(),
  description:            z.string().nullable().optional(),
  nationalCode:           z.string().nullable().optional(),
  molId:                  z.string().nullable().optional(),
  crId:                   z.string().nullable().optional(),
  country:                z.string().nullable().optional(),
  city:                   z.string().nullable().optional(),
  address:                z.string().nullable().optional(),
  poBox:                  z.string().nullable().optional(),
  telephone:              z.string().nullable().optional(),
  fax:                    z.string().nullable().optional(),
  email:                  z.string().email().nullable().optional(),
  website:                z.string().nullable().optional(),
  socialSecurityLocation: z.string().nullable().optional(),
  managerName:            z.string().nullable().optional(),
  establishedDate:        z.string().nullable().optional(),
  costCenter:             z.string().nullable().optional(),
  baseCurrency:           z.string().nullable().optional(),
  taxCurrency:            z.string().nullable().optional(),
  taxProfile:             z.string().nullable().optional(),
  countryProfile:         z.string().nullable().optional(),
  isHeadQuarter:          z.boolean().optional(),
  deductNationalTax:      z.boolean().optional(),
  syncFromHeadQuarter:    z.boolean().optional(),
  canModifyEmployeeTax:   z.boolean().optional(),
  isActive:               z.boolean().optional(),
})

export async function GET() {
  try {
    const { orgId } = await getProfileOrRedirect()

    const branches = await prisma.branch.findMany({
      where:   { organizationId: orgId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { orgUnits: true } } },
    })

    return NextResponse.json({ ok: true, data: branches })
  } catch (e) {
    console.error('[GET /api/branches]', e)
    return NextResponse.json({ error: 'Failed to load branches' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { profile, orgId } = await getProfileOrRedirect()

    if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body   = await req.json()
    const parsed = branchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const { isHeadQuarter, establishedDate, ...rest } = parsed.data

    // Enforce single HQ: clear any existing HQ before setting a new one
    if (isHeadQuarter) {
      await prisma.branch.updateMany({
        where: { organizationId: orgId, isHeadQuarter: true },
        data:  { isHeadQuarter: false },
      })
    }

    const branch = await prisma.branch.create({
      data: {
        ...rest,
        organizationId:  orgId,
        isHeadQuarter:   isHeadQuarter ?? false,
        establishedDate: establishedDate ? new Date(establishedDate) : null,
      },
      include: { _count: { select: { orgUnits: true } } },
    })

    await logActivity(orgId, profile.id, profile.email, 'BRANCH_CREATED',
      { type: 'Branch', id: branch.id }, { name: branch.name })

    return NextResponse.json({ ok: true, data: branch }, { status: 201 })
  } catch (e: unknown) {
    console.error('[POST /api/branches]', e)
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'A branch with this code already exists' }, { status: 409 })
    }
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'development' && e instanceof Error ? e.message : 'Failed to create branch' },
      { status: 500 }
    )
  }
}
