import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const VALID_TYPES = ['DEDUCTION', 'OTHER_INCOME', 'OVERTIME'] as const

const createSchema = z.object({
  employeeId:      z.string().min(1),
  transactionType: z.enum(VALID_TYPES),
  typeId:          z.string().min(1),
  typeName:        z.string().min(1).max(200),
  amount:          z.number().min(0),
  hours:           z.number().min(0).nullable().optional(),
  transactionDate: z.string().nullable().optional(),
  periodYear:      z.number().int().min(2000).max(2100),
  periodMonth:     z.number().int().min(1).max(12),
  description:     z.string().max(500).nullable().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await getProfileOrRedirect()

    const { searchParams } = new URL(req.url)
    const employeeId      = searchParams.get('employeeId') ?? ''
    const periodYear      = Number.parseInt(searchParams.get('periodYear') ?? '0', 10)
    const periodMonth     = Number.parseInt(searchParams.get('periodMonth') ?? '0', 10)
    const transactionType = searchParams.get('transactionType') ?? ''

    if (!employeeId || !periodYear || !periodMonth) {
      return NextResponse.json({ ok: true, data: [] })
    }

    const transactions = await prisma.salaryTransaction.findMany({
      where: {
        organizationId: orgId,
        employeeId,
        periodYear,
        periodMonth,
        ...(transactionType ? { transactionType } : {}),
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ ok: true, data: transactions })
  } catch (e) {
    console.error('[GET /api/salary-transactions]', e)
    return NextResponse.json({ error: 'Failed to load transactions' }, { status: 500 })
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

    const employee = await prisma.employee.findFirst({
      where: { id: parsed.data.employeeId, organizationId: orgId },
    })
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const { transactionDate, ...rest } = parsed.data
    const transaction = await prisma.salaryTransaction.create({
      data: {
        ...rest,
        organizationId: orgId,
        ...(transactionDate ? { transactionDate: new Date(transactionDate) } : {}),
      },
    })

    await logActivity(orgId, profile.id, profile.email, 'SALARY_TRANSACTION_CREATED',
      { type: 'SalaryTransaction', id: transaction.id },
      { transactionType: transaction.transactionType, typeName: transaction.typeName, amount: transaction.amount })

    return NextResponse.json({ ok: true, data: transaction }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/salary-transactions]', e)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}
