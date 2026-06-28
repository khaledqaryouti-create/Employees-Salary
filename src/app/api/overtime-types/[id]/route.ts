import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { getProfileOrRedirect } from '@/lib/auth/get-profile'
import { logActivity } from '@/lib/system-log'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'HR_ADMIN'])

const updateSchema = z.object({
  // Basic
  name:        z.string().min(1).max(200).optional(),
  nameAr:      z.string().max(200).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  isActive:    z.boolean().optional(),

  // Hours & Amount Limits
  maxHoursDaily:              z.number().nullable().optional(),
  maxHoursWeekly:             z.number().nullable().optional(),
  maxHoursMonthly:            z.number().nullable().optional(),
  maxAmountDaily:             z.number().nullable().optional(),
  maxAmountWeekly:            z.number().nullable().optional(),
  maxAmountMonthly:           z.number().nullable().optional(),
  maxAmountPercentSalary:     z.number().nullable().optional(),
  upperLimitAction:           z.string().nullable().optional(),

  // Budget
  budgetLimitEnabled:         z.boolean().optional(),
  budgetHierarchy:            z.string().nullable().optional(),

  // Work Week & Calendar
  workWeekStart:              z.string().nullable().optional(),
  workWeekEnd:                z.string().nullable().optional(),
  workingDaysPerMonth:        z.number().int().nullable().optional(),
  excludeWeekendsFromCalendar: z.boolean().optional(),
  shiftBasedWorkingDays:      z.boolean().optional(),
  workingHoursPerDay:         z.number().nullable().optional(),

  // Rounding & Entry
  roundingRule:               z.string().nullable().optional(),
  payWithRounding:            z.boolean().optional(),
  entryFormat:                z.string().nullable().optional(),
  autoCalcEnabled:            z.boolean().optional(),

  // Rate & Calculation
  baseSalaryMultiplier:       z.number().nullable().optional(),
  fixedRateEnabled:           z.boolean().optional(),
  fixedRateAmount:            z.number().nullable().optional(),
  includeHousing:             z.boolean().optional(),
  conversionEnabled:          z.boolean().optional(),
  conversionHoursPerDay:      z.number().nullable().optional(),

  // Validation & Overlap
  otSourceType:               z.string().nullable().optional(),
  validateLimitsAt:           z.string().nullable().optional(),
  checkOverlap:               z.boolean().optional(),
  backDateLimitDays:          z.number().int().nullable().optional(),
  allowMultiplePerDay:        z.boolean().optional(),

  // Shift & Schedule
  shiftEndDelayMinutes:       z.number().int().nullable().optional(),
  restrictToShift:            z.boolean().optional(),
  restrictToShiftPeriod:      z.boolean().optional(),
  requestDaysRestriction:     z.string().nullable().optional(),

  // Attachments, Reason & ESS
  attachmentMandatory:        z.boolean().optional(),
  reasonMandatory:            z.boolean().optional(),
  essRestricted:              z.boolean().optional(),
  nonPayrollRouting:          z.boolean().optional(),
  nonPayrollCode:             z.string().nullable().optional(),

  // Salary Calculation
  includeInSalaryCalc:        z.boolean().optional(),
  salaryCalcMethod:           z.string().nullable().optional(),
  includeBasicSalary:         z.boolean().optional(),
  salaryCalcNote:             z.string().nullable().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { orgId } = await getProfileOrRedirect()

    const record = await prisma.overtimeType.findFirst({ where: { id, organizationId: orgId } })
    if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ ok: true, data: record })
  } catch (e) {
    console.error('[GET /api/overtime-types/[id]]', e)
    return NextResponse.json({ error: 'Failed to load overtime type' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { profile, orgId } = await getProfileOrRedirect()

    if (!ADMIN_ROLES.has(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const existing = await prisma.overtimeType.findFirst({ where: { id, organizationId: orgId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const updated = await prisma.overtimeType.update({
      where: { id },
      data: parsed.data,
    })

    await logActivity(orgId, profile.id, profile.email, 'OVERTIME_TYPE_UPDATED',
      { type: 'OvertimeType', id }, { name: updated.name })

    return NextResponse.json({ ok: true, data: updated })
  } catch (e: unknown) {
    console.error('[PATCH /api/overtime-types/[id]]', e)
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'An overtime type with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to update overtime type' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { profile, orgId } = await getProfileOrRedirect()

    if (!ADMIN_ROLES.has(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const existing = await prisma.overtimeType.findFirst({ where: { id, organizationId: orgId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.overtimeType.delete({ where: { id } })

    await logActivity(orgId, profile.id, profile.email, 'OVERTIME_TYPE_DELETED',
      { type: 'OvertimeType', id }, { name: existing.name })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE /api/overtime-types/[id]]', e)
    return NextResponse.json({ error: 'Failed to delete overtime type' }, { status: 500 })
  }
}
