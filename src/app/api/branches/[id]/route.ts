import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'

const updateSchema = z.object({
  name:                   z.string().min(1).max(150).optional(),
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
  logoUrl:                z.string().nullable().optional(),
  isHeadQuarter:          z.boolean().optional(),
  deductNationalTax:      z.boolean().optional(),
  syncFromHeadQuarter:    z.boolean().optional(),
  canModifyEmployeeTax:   z.boolean().optional(),
  isActive:               z.boolean().optional(),
})

type Params = { params: Promise<{ id: string }> }

async function clearHeadQuarterFlag(orgId: string) {
  await prisma.branch.updateMany({
    where: { organizationId: orgId, isHeadQuarter: true },
    data:  { isHeadQuarter: false },
  })
}

function buildBranchUpdateData(
  rest: Record<string, unknown>,
  isHeadQuarter: boolean | undefined,
  establishedDate: string | null | undefined,
) {
  return {
    ...rest,
    ...(isHeadQuarter === undefined ? {} : { isHeadQuarter }),
    ...(establishedDate === undefined
      ? {}
      : { establishedDate: establishedDate ? new Date(establishedDate) : null }),
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { profile, orgId } = await getProfileOrRedirect()

    if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const body   = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const existing = await prisma.branch.findFirst({ where: { id, organizationId: orgId } })
    if (!existing) return NextResponse.json({ error: 'Branch not found' }, { status: 404 })

    const { isHeadQuarter, establishedDate, ...rest } = parsed.data

    // Enforce single HQ
    if (isHeadQuarter === true && !existing.isHeadQuarter) {
      await clearHeadQuarterFlag(orgId)
    }

    const branch = await prisma.branch.update({
      where: { id },
      data:  buildBranchUpdateData(rest, isHeadQuarter, establishedDate),
      include: { _count: { select: { orgUnits: true } } },
    })

    await logActivity(orgId, profile.id, profile.email, 'BRANCH_UPDATED',
      { type: 'Branch', id: branch.id }, { name: branch.name })

    return NextResponse.json({ ok: true, data: branch })
  } catch (e: unknown) {
    console.error('[PATCH /api/branches/[id]]', e)
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'A branch with this code already exists' }, { status: 409 })
    }
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'development' && e instanceof Error ? e.message : 'Failed to update branch' },
      { status: 500 }
    )
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { profile, orgId } = await getProfileOrRedirect()

    if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const branch = await prisma.branch.findFirst({
      where:   { id, organizationId: orgId },
      include: { _count: { select: { orgUnits: true } } },
    })
    if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 })

    if (branch._count.orgUnits > 0) {
      return NextResponse.json(
        { error: `Cannot delete: this branch has ${branch._count.orgUnits} linked org unit(s). Reassign them first.` },
        { status: 409 }
      )
    }

    await prisma.branch.delete({ where: { id } })

    await logActivity(orgId, profile.id, profile.email, 'BRANCH_DELETED',
      { type: 'Branch', id }, { name: branch.name })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE /api/branches/[id]]', e)
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'development' && e instanceof Error ? e.message : 'Failed to delete branch' },
      { status: 500 }
    )
  }
}
