import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'

const updateSchema = z.object({
  name:        z.string().min(1).max(150).optional(),
  nameAr:      z.string().nullable().optional(),
  grade:       z.string().nullable().optional(),
  mappingCode:     z.string().nullable().optional(),
  integrationCode: z.string().nullable().optional(),
  jobFamilyId:     z.string().optional(),
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

    const existing = await prisma.jobTitle.findFirst({
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

    // If changing family, verify it belongs to this org
    if (parsed.data.jobFamilyId) {
      const family = await prisma.jobFamily.findFirst({
        where: { id: parsed.data.jobFamilyId, organizationId: orgId },
      })
      if (!family) return NextResponse.json({ error: 'Invalid job family' }, { status: 400 })
    }

    const updated = await prisma.jobTitle.update({
      where: { id },
      data: parsed.data,
      include: {
        jobFamily: { select: { id: true, name: true } },
        _count: { select: { employees: true } },
      },
    })

    await logActivity(orgId, profile.id, profile.email, 'JOB_TITLE_UPDATED',
      { type: 'JobTitle', id }, { name: updated.name })

    return NextResponse.json({ ok: true, data: updated })
  } catch (e) {
    console.error('[PATCH /api/job-titles/[id]]', e)
    return NextResponse.json({ error: 'Failed to update job title' }, { status: 500 })
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

    const existing = await prisma.jobTitle.findFirst({
      where: { id, organizationId: orgId },
      include: { _count: { select: { employees: true } } },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (existing._count.employees > 0) {
      return NextResponse.json(
        { error: `Cannot delete — ${existing._count.employees} employee(s) are assigned to this title. Reassign them first.` },
        { status: 409 }
      )
    }

    await prisma.jobTitle.delete({ where: { id } })

    await logActivity(orgId, profile.id, profile.email, 'JOB_TITLE_DELETED',
      { type: 'JobTitle', id }, { name: existing.name })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE /api/job-titles/[id]]', e)
    return NextResponse.json({ error: 'Failed to delete job title' }, { status: 500 })
  }
}
