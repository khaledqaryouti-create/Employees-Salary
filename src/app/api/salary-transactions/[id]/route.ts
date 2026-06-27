import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'

const ADMIN_ROLES = ['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN']

const updateSchema = z.object({
  typeId:          z.string().min(1).optional(),
  typeName:        z.string().min(1).max(200).optional(),
  amount:          z.number().min(0).optional(),
  hours:           z.number().min(0).nullable().optional(),
  transactionDate: z.string().nullable().optional(),
  description:     z.string().max(500).nullable().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { profile, orgId } = await getProfileOrRedirect()

    if (!ADMIN_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.salaryTransaction.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const { transactionDate, ...rest } = parsed.data
    const updated = await prisma.salaryTransaction.update({
      where: { id },
      data: {
        ...rest,
        ...(transactionDate === undefined
          ? {}
          : { transactionDate: transactionDate ? new Date(transactionDate) : null }),
      },
    })

    await logActivity(orgId, profile.id, profile.email, 'SALARY_TRANSACTION_UPDATED',
      { type: 'SalaryTransaction', id: updated.id }, parsed.data)

    return NextResponse.json({ ok: true, data: updated })
  } catch (e) {
    console.error('[PATCH /api/salary-transactions/[id]]', e)
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { profile, orgId } = await getProfileOrRedirect()

    if (!ADMIN_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.salaryTransaction.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    await prisma.salaryTransaction.delete({ where: { id } })

    await logActivity(orgId, profile.id, profile.email, 'SALARY_TRANSACTION_DELETED',
      { type: 'SalaryTransaction', id },
      { transactionType: existing.transactionType, typeName: existing.typeName })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE /api/salary-transactions/[id]]', e)
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 })
  }
}
