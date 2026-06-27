import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'

const addSchema = z.object({
  allowanceTypeId: z.string().min(1, 'Allowance type is required'),
  amount:          z.coerce.number().nonnegative('Amount must be 0 or more'),
  isPercentage:    z.boolean().optional().default(false),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params
    const { orgId } = await getProfileOrRedirect()

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, organizationId: orgId },
      select: { id: true },
    })
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const structure = await prisma.salaryStructure.findUnique({
      where: { employeeId },
      include: {
        components: {
          include: { component: { select: { name: true, type: true } } },
        },
      },
    })

    const allowances = (structure?.components ?? [])
      .filter((c) => c.component.type === 'EARNING')
      .map((c) => ({
        id:           c.id,
        name:         c.component.name,
        amount:       c.amount,
        isPercentage: c.isPercentage,
      }))

    return NextResponse.json({ ok: true, data: allowances })
  } catch (e) {
    console.error('[GET /api/employees/[id]/allowances]', e)
    return NextResponse.json({ error: 'Failed to load allowances' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params
    const { orgId } = await getProfileOrRedirect()

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, organizationId: orgId },
      select: { id: true },
    })
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const body   = await req.json()
    const parsed = addSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const { allowanceTypeId, amount, isPercentage } = parsed.data

    // Verify allowance type belongs to this org
    const allowanceType = await prisma.allowanceType.findFirst({
      where: { id: allowanceTypeId, organizationId: orgId, isActive: true },
    })
    if (!allowanceType) {
      return NextResponse.json({ error: 'Allowance type not found' }, { status: 404 })
    }

    // Find or create an org-level SalaryComponent for this allowance type
    let component = await prisma.salaryComponent.findFirst({
      where: {
        organizationId: orgId,
        name:           allowanceType.name,
        type:           'EARNING',
      },
    })
    if (!component) {
      component = await prisma.salaryComponent.create({
        data: {
          organizationId: orgId,
          name:           allowanceType.name,
          nameAr:         allowanceType.nameAr ?? undefined,
          type:           'EARNING',
          isActive:       true,
        },
      })
    }

    // Upsert SalaryStructure (create with basicSalary=0 if missing)
    const structure = await prisma.salaryStructure.upsert({
      where:  { employeeId },
      update: {},
      create: {
        employeeId,
        basicSalary: 0,
        currency:    'USD',
      },
    })

    // Create the SalaryComponentValue
    const value = await prisma.salaryComponentValue.create({
      data: {
        salaryStructureId: structure.id,
        componentId:       component.id,
        amount,
        isPercentage:      isPercentage ?? false,
      },
    })

    return NextResponse.json({ ok: true, data: value }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/employees/[id]/allowances]', e)
    return NextResponse.json({ error: 'Failed to add allowance' }, { status: 500 })
  }
}
