import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'

const updateSchema = z.object({
  name:        z.string().min(1).max(100).optional(),
  nameAr:      z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  isActive:    z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { profile, orgId } = await getProfileOrRedirect()
    const { id } = await params

    if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const existing = await prisma.jobFamily.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const updated = await prisma.jobFamily.update({
      where: { id },
      data: parsed.data,
      include: { _count: { select: { jobTitles: true } } },
    })

    await logActivity(orgId, profile.id, profile.email, 'JOB_FAMILY_UPDATED',
      { type: 'JobFamily', id }, { name: updated.name })

    return NextResponse.json({ ok: true, data: updated })
  } catch (e) {
    console.error('[PATCH /api/job-families/[id]]', e)
    return NextResponse.json({ error: 'Failed to update job family' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { profile, orgId } = await getProfileOrRedirect()
    const { id } = await params

    if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const existing = await prisma.jobFamily.findFirst({
      where: { id, organizationId: orgId },
      include: { _count: { select: { jobTitles: true } } },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (existing._count.jobTitles > 0) {
      return NextResponse.json(
        { error: `Cannot delete — this family has ${existing._count.jobTitles} job title(s). Delete or reassign them first.` },
        { status: 409 }
      )
    }

    await prisma.jobFamily.delete({ where: { id } })

    await logActivity(orgId, profile.id, profile.email, 'JOB_FAMILY_DELETED',
      { type: 'JobFamily', id }, { name: existing.name })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE /api/job-families/[id]]', e)
    return NextResponse.json({ error: 'Failed to delete job family' }, { status: 500 })
  }
}
