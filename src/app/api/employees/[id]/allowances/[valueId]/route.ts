import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'

const updateSchema = z.object({
  amount:       z.coerce.number().nonnegative('Amount must be 0 or more'),
  isPercentage: z.boolean().optional(),
})

async function verifyOwnership(employeeId: string, valueId: string, orgId: string) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, organizationId: orgId },
    select: { id: true },
  })
  if (!employee) return null

  return prisma.salaryComponentValue.findFirst({
    where: { id: valueId, salaryStructure: { employeeId } },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; valueId: string }> }
) {
  try {
    const { id: employeeId, valueId } = await params
    const { orgId } = await getProfileOrRedirect()

    const existing = await verifyOwnership(employeeId, valueId, orgId)
    if (!existing) {
      return NextResponse.json({ error: 'Allowance not found' }, { status: 404 })
    }

    const body   = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const updated = await prisma.salaryComponentValue.update({
      where: { id: valueId },
      data: {
        amount:       parsed.data.amount,
        isPercentage: parsed.data.isPercentage ?? existing.isPercentage,
      },
    })

    return NextResponse.json({ ok: true, data: updated })
  } catch (e) {
    console.error('[PATCH /api/employees/[id]/allowances/[valueId]]', e)
    return NextResponse.json({ error: 'Failed to update allowance' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; valueId: string }> }
) {
  try {
    const { id: employeeId, valueId } = await params
    const { orgId } = await getProfileOrRedirect()

    const existing = await verifyOwnership(employeeId, valueId, orgId)
    if (!existing) {
      return NextResponse.json({ error: 'Allowance not found' }, { status: 404 })
    }

    await prisma.salaryComponentValue.delete({ where: { id: valueId } })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE /api/employees/[id]/allowances/[valueId]]', e)
    return NextResponse.json({ error: 'Failed to delete allowance' }, { status: 500 })
  }
}
